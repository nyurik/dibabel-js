import json
import random
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from sys import intern
from typing import Generator, Optional, List, Dict, Set, Iterable, Tuple

from requests import Session
from requests.adapters import HTTPAdapter
# noinspection PyUnresolvedReferences
from requests.packages.urllib3.util.retry import Retry
from sqlitedict import SqliteDict

from .DataTypes import TitleSitelinksCache, SyncInfo, SiteMetadata, WdWarning, WdSitelink, TitleSitelinks, \
    Translations
from .PageContent import TitlePagePair, PageContent
from .PagePrimary import PagePrimary
from .Sparql import Sparql
from .WikiSite import WikiSite
from .utils import batches, title_to_url, parse_wd_sitelink, update_dict_of_dicts, calc_hash

primary_domain = 'www.mediawiki.org'


class SessionState:
    def __init__(self, cache_file: str, user_requested=False):
        self.user_requested = user_requested
        random.seed()
        self.key = random.randint(0, 999999)
        print(f'Opening SQL connection for {self.key} at {datetime.utcnow()}')
        self.cache = SqliteDict(cache_file, autocommit=True)
        self.session = Session()
        # noinspection PyTypeChecker
        self.session.mount(
            'https://',
            HTTPAdapter(max_retries=Retry(total=3, backoff_factor=0.1, status_forcelist=[500, 502, 503, 504])))
        self.sites = {}

    def __enter__(self):
        return self

    def __exit__(self, typ, value, traceback):
        self.cache.close()
        self.session.close()
        print(f'Closed SQL connection for {self.key} at {datetime.utcnow()}')

    def get_site(self, domain: str) -> WikiSite:
        try:
            return self.sites[domain]
        except KeyError:
            # noinspection PyTypeChecker
            site = WikiSite(domain, self.session, domain == primary_domain)
            if self.user_requested:
                site.maxlag = None
            self.sites[domain] = site
            return site


class QueryCache:
    primary_pages_by_qid: Dict[str, PagePrimary]
    primary_pages_by_title: Dict[str, PagePrimary]
    primary_site: WikiSite
    sites_metadata: Dict[str, SiteMetadata]
    summary_i18n: Dict[str, Dict[str, str]]
    syncinfo_by_qid_domain: Dict[str, Dict[str, SyncInfo]]
    title_sitelinks: TitleSitelinksCache

    def __init__(self, cache_dir):
        cache_dir = Path(cache_dir)
        cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_file = str(cache_dir / 'cache.sqlite')
        self.wikidata = Sparql()
        with self.create_session(user_requested=False) as state:
            self.primary_site = state.get_site(primary_domain)
            self.sites_metadata = state.cache.get('sites_metadata', {})

            # Template name -> domain -> localized template name
            self.title_sitelinks = state.cache.get('title_sitelinks') or {}

            self.primary_pages_by_qid = {}
            self.primary_pages_by_title = {}

            self.syncinfo_by_qid_domain = {
                v[len('info_by_qid:'):]: state.cache[v]
                for v in state.cache.keys()
                if v.startswith('info_by_qid:')}

            self.update_metadata(state, [primary_domain])
            self.refresh_state(state)

        print('Done initializing')

    def refresh_state(self, state: SessionState):
        wd_warnings = []
        # Query WDQS for the list of all available primary pages
        # Init self.primary_pages_by_qid and self.primary_pages_by_title
        self.query_primary_pages(wd_warnings)
        # Load primary page history and update the sitelinks for pages and dependencies
        self.update_primary_pages(state)
        # Download content of all copies and compute sync info
        self.update_syncinfo(state)
        # Update localization strings
        self.summary_i18n = self.get_translation_table(state)

    def create_session(self, user_requested) -> SessionState:
        return SessionState(self.cache_file, user_requested)

    def query_primary_pages(self, warnings: List[WdWarning]) -> None:
        """
        Update self.primary_pages_by_qid and _by_title from WDQS
        """
        query = '''\
SELECT ?id ?sl WHERE {
  ?id wdt:P31 wd:Q63090714.
  ?sl schema:about ?id;
      schema:isPartOf <https://%%%/>.
}'''.replace('%%%', primary_domain)

        found_qids = []
        for row in self.wikidata.query(query):
            qid = row['id']['value'][len('http://www.wikidata.org/entity/'):]
            res = parse_wd_sitelink(qid, row['sl']['value'], warnings)
            if res:
                found_qids.append(qid)
                if qid not in self.primary_pages_by_qid:
                    self.primary_pages_by_qid[qid] = PagePrimary(qid, res.title, self.title_sitelinks)

        # Remove primary pages that are no longer listed as multi-copiable in WD
        for old_key in set(self.primary_pages_by_qid.keys()).difference(found_qids):
            del self.primary_pages_by_qid[old_key]

        # Update reverse lookup by title
        self.primary_pages_by_title = {v.title: v for v in self.primary_pages_by_qid.values()}

    def update_primary_pages(self, state: SessionState, page: Optional[PagePrimary] = None):
        primary_metadata = self.sites_metadata[primary_domain]
        pages_to_update = list(self.primary_pages_by_qid.values()) if page is None else [page]
        # Load primary page revision history from cache if needed
        for page in pages_to_update:
            if not page.history:
                page.set_history(state.cache.get(f"primary:{page.title}") or [], primary_metadata)
        # Find latest available revisions for primary pages, and cleanup if don't exist
        latest_primary_revids: Dict[str, int] = {}
        for title, revid in self.primary_site.query_pages_revid((v.title for v in pages_to_update)):
            if revid == 0:
                page = self.primary_pages_by_title.pop(title)
                del self.primary_pages_by_qid[page.qid]
            else:
                latest_primary_revids[title] = revid
        # Load page history if needed, and cache it
        for page in pages_to_update:
            revid = latest_primary_revids[page.title]
            hist = self.primary_site.load_page_history(page.title, page.history, revid)
            if hist:
                page.add_to_history(hist, primary_metadata)
                state.cache[f"primary:{page.title}"] = page.history
        # Load sitelinks for both primary pages and their dependencies
        titles = set((v.title for v in pages_to_update))
        for page in pages_to_update:
            titles.update(page.historic_dependencies)
        self.update_sitelinks_map(state, titles)

    def update_syncinfo(self, state: SessionState,
                        sitelink: Optional[WdSitelink] = None) -> List[Tuple[PageContent, SyncInfo]]:
        """
        Get a list of domain/title/PageContent tuples
        """
        infos = self.syncinfo_by_qid_domain
        if sitelink:
            # if not refresh:
            #     sitelinks = filter(lambda v: v.qid not in infos or v.domain not in infos[v.qid], sitelinks)
            # qid_by_domain_title = dict_of_dicts(sitelinks, lambda v: v.domain, lambda v: v.title, lambda v: v.qid)
            qid_by_domain_title = {sitelink.domain: {sitelink.title: sitelink.qid}}
        else:
            qid_by_domain_title = defaultdict(dict)
            for qid, page in self.primary_pages_by_qid.items():
                links = self.title_sitelinks[page.title]
                for domain, title in links.domain_to_title.items():
                    if qid not in infos or domain not in infos[qid]:
                        qid_by_domain_title[domain][title] = qid

        result = []
        changed_qid = set()
        for domain, titles_qid in sorted(qid_by_domain_title.items(), key=lambda v: v[0]):
            for title, page in self.get_page_content(state, domain, titles_qid.keys(), bool(sitelink)):
                qid = titles_qid[title]
                old_revid = 0 if qid not in infos or domain not in infos[qid] else infos[qid][domain].dst_revid
                if page is None or old_revid != page.revid:
                    primary = self.primary_pages_by_qid[qid]
                    metadata = self.sites_metadata[domain]
                    if page is None:
                        last_rev = primary.last_revision
                        info = SyncInfo(
                            'new', primary.qid, primary.title, domain, title,
                            new_content=intern(primary.localize_content(last_rev.content, metadata, domain)),
                            hash=calc_hash(last_rev.content))
                    else:
                        info = primary.compute_sync_info(primary.qid, page, metadata)
                        update_dict_of_dicts(infos, primary.qid, domain, info)
                        changed_qid.add(qid)
                else:
                    info = infos[qid][domain]
                result.append((page, info))

        for qid in changed_qid:
            state.cache[f'info_by_qid:{qid}'] = infos[qid]

        return result

    def update_sitelinks_map(self, state: SessionState, titles: Iterable[str]):
        # Ask source to resolve titles
        normalized = {}
        redirects = {}
        missing = set()
        pages = set()
        for batch in batches(sorted(set(titles)), 50):
            res = next(self.primary_site.query(titles=batch, redirects=True))
            if 'normalized' in res:
                normalized.update({v['from']: v.to for v in res.normalized})
            if 'redirects' in res:
                redirects.update({v['from']: v.to for v in res.redirects})
            for v in res.pages:
                if 'missing' in v:
                    missing.add(v['title'])
                else:
                    pages.add(v['title'])

        vals = "\n".join((f'<{title_to_url(primary_domain, v)}>' for v in pages))
        query = f'''\
SELECT ?id ?sl ?is_multi ?is_non_multi
WHERE {{ 
  VALUES ?mw {{
{vals}
  }}
  ?mw schema:about ?id.
  ?sl schema:about ?id.
  BIND( EXISTS {{?id wdt:P31 wd:Q63090714}} AS ?is_multi)
  BIND( EXISTS {{?id wdt:P31 wd:Q98545791}} AS ?is_non_multi)
}}'''
        query_result = self.wikidata.query(query)
        qid_copies = []
        qid_primary = {}
        for row in query_result:
            qid = row['id']['value'][len('http://www.wikidata.org/entity/'):]
            is_multi = row['is_multi']['value'] == 'true'
            is_non_multi = row['is_non_multi']['value'] == 'true'
            res = parse_wd_sitelink(qid, row['sl']['value'])
            if res:
                if res.domain == primary_domain:
                    qid_primary[qid] = res.title
                    status = 'sync' if is_multi else 'manual_sync' if is_non_multi else 'no_sync'
                    self.title_sitelinks[res.title] = TitleSitelinks(qid, res.title, status, {})
                else:
                    qid_copies.append(res)

        for title in pages:
            if title not in self.title_sitelinks:
                self.title_sitelinks[title] = TitleSitelinks(None, title, 'no_wd', {})

        for frm, to in redirects.items():
            try:
                self.title_sitelinks[frm] = self.title_sitelinks[to]
            except KeyError:
                self.title_sitelinks[frm] = TitleSitelinks(None, frm, 'missing', {})

        for frm, to in normalized.items():
            try:
                self.title_sitelinks[frm] = self.title_sitelinks[to]
            except KeyError:
                # Save normalized title
                self.title_sitelinks[frm] = TitleSitelinks(None, to, 'missing', {})

        # Ensure all titles are present in cache
        for title in missing:
            if title not in self.title_sitelinks:
                self.title_sitelinks[title] = TitleSitelinks(None, title, 'missing', {})

        # Update sitelinks for copies
        for row in qid_copies:
            self.title_sitelinks[qid_primary[row.qid]].domain_to_title[row.domain] = row.title

        state.cache['title_sitelinks'] = self.title_sitelinks

    def get_page_content(self,
                         state: SessionState,
                         domain: str,
                         titles: Iterable[str],
                         refresh=False
                         ) -> Generator[TitlePagePair, None, None]:
        site = state.get_site(domain)

        cached_pages = {}
        unresolved: Set[str] = set()
        for title in titles:
            page = state.cache.get(title_to_url(site.domain, title))
            if page:
                cached_pages[title] = page
            else:
                unresolved.add(title)

        self.update_metadata(state, [domain])

        if cached_pages:
            if refresh:
                for title, revid in site.query_pages_revid(cached_pages.keys()):
                    cache_title = title_to_url(site.domain, title)
                    page = cached_pages.pop(title)
                    if revid == 0:
                        del state.cache[cache_title]
                        yield title, None
                    elif revid != page.revid:
                        del state.cache[cache_title]
                        unresolved.add(title)
                    else:
                        yield page.title, page
                if cached_pages:
                    raise ValueError('Unexpected titles not found: ' + ', '.join(cached_pages.keys()))
            else:
                yield from cached_pages.items()

        if unresolved:
            for title, page in site.query_pages_content(unresolved):
                cache_title = title_to_url(site.domain, title)
                if page is None:
                    state.cache.pop(cache_title, None)  # ok if doesn't exist
                else:
                    state.cache[cache_title] = page
                yield title, page

    def is_stale_metadata(self, domain: str) -> bool:
        md = self.sites_metadata.get(domain)
        return not md or (datetime.utcnow() - md.last_updated) > timedelta(days=30)

    def update_metadata(self, state: SessionState, domains: Iterable[str]) -> None:
        updated = False
        for domain in sorted(domains):
            if self.is_stale_metadata(domain):
                self.sites_metadata[domain] = state.get_site(domain).query_metadata()
                updated = True
        if updated:
            state.cache['sites_metadata'] = self.sites_metadata

    def get_translation_table(self, state: SessionState) -> Translations:
        title, page = next(self.get_page_content(state, 'commons.wikimedia.org', ['Data:I18n/DiBabel.tab']))
        if not page:
            raise ValueError(f"Unable to load {title} from commons.wikimedia.org")
        return {k: v for k, v in json.loads(page.content)['data']}

    @staticmethod
    def info_obj(p: SyncInfo):
        res = dict(domain=p.dst_domain, title=p.dst_title, status=p.status)
        if p.hash:
            res['hash'] = p.hash
        if p.dst_timestamp:
            res['timestamp'] = p.dst_timestamp
        if p.behind:
            res['behind'] = p.behind
            res['matchedRevId'] = p.matched_revid
        if p.dst_protection:
            res['protection'] = p.dst_protection
        return res

    def prepare_result(self, single_qid: Optional[str] = None) -> Dict[str, any]:
        qids = set(self.syncinfo_by_qid_domain.keys()) if single_qid is None else {single_qid}

        # Keep iterating until no more new dependent pages
        other_deps = set()
        found = 0
        while found != len(qids):
            found = len(qids)
            for qid in list(qids):
                page = self.primary_pages_by_qid[qid]
                for dep in page.dependencies:
                    sl = self.title_sitelinks[dep]
                    if sl.pageType == 'sync':
                        qids.add(sl.qid)
                    else:
                        other_deps.add(sl.normalizedTitle)

        pages = []
        for qid in qids:
            page = self.primary_pages_by_qid[qid]
            pages.append(dict(
                primaryTitle=page.title,
                type=self.title_sitelinks[page.title].pageType,
                primarySite=primary_domain,
                qid=qid,
                primaryRevId=page.last_revision.revid,
                dependencies=[
                    vv.normalizedTitle
                    for vv in [self.title_sitelinks[v]
                               for v in self.primary_pages_by_qid[qid].dependencies]],
                copies=[self.info_obj(info) for info in self.syncinfo_by_qid_domain[qid].values()]
            ))

        for dep in sorted(other_deps):
            sl = self.title_sitelinks[dep]
            obj = dict(
                primaryTitle=sl.normalizedTitle,
                type=sl.pageType,
                primarySite=primary_domain,
            )
            if sl.qid is not None:
                obj['qid'] = sl.qid
            if sl.pageType == 'manual_sync' or sl.pageType == 'no_sync':
                obj['copies'] = [dict(domain=d, title=t) for d, t in sl.domain_to_title.items()]
            pages.append(obj)

        return dict(
            pages=pages,
        )

    # noinspection PyUnusedLocal
    def get_data(self, state: SessionState) -> Dict[str, List[dict]]:
        return self.prepare_result()

    def get_page(self, state: SessionState, qid: str, domain: str) -> Optional[dict]:
        primary = self.primary_pages_by_qid[qid]

        info = self.syncinfo_by_qid_domain[qid].get(domain)
        if info:
            title = info.dst_title
        else:
            # in case the copy does not exist (assuming client wants to create a new copy),
            # need to generate the new title using localized namespaces
            self.update_metadata(state, [domain])
            meta = self.sites_metadata[domain]
            title = (meta.module_ns if primary.is_module else meta.template_ns) + ':' + primary.title.split(':', 1)[1]
        page, info = self.update_syncinfo(state, WdSitelink(qid, domain, title))[0]

        result = self.prepare_result(qid)

        content = dict(
            changeType=info.status,
            domain=domain,
            qid=qid,
            title=primary.title,
        )
        if info.status != 'ok':
            content['newText'] = info.new_content
        if page is not None:
            content['currentText'] = page.content
            content['currentRevId'] = page.revid
            content['currentRevTs'] = page.content_ts
            if info.status == 'outdated':
                content['changes'] = [dict(
                    user=v.user,
                    ts=v.ts,
                    comment=v.comment,
                    revid=v.revid
                ) for v in primary.history[-info.behind:]]
        result['content'] = content

        return result
