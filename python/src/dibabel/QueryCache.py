import pickle
import sqlite3
import zlib
from datetime import datetime, timedelta
from itertools import chain
from json import dumps, loads
from pathlib import Path
from typing import Generator, Tuple, Optional
from typing import List, Dict, Set, Iterable

from requests import Session
from requests.adapters import HTTPAdapter
# noinspection PyUnresolvedReferences
from requests.packages.urllib3.util.retry import Retry
from sqlitedict import SqliteDict

from .DataTypes import RevComment, TemplateCache, SyncInfo, SiteMetadata, WdWarning, WdSitelink, TemplateReplacements
from .PageContent import TitlePagePair, PageContent
from .PagePrimary import PagePrimary
from .Sparql import Sparql
from .WikiSite import WikiSite
from .utils import batches, title_to_url, parse_wd_sitelink, dict_of_dicts, update_dict_of_dicts

known_unshared = {'Template:Documentation'}


class QueryCache:
    max_stale_minutes = 60 * 24 * 5

    def __init__(self, cache_dir):
        self.primary_domain = 'www.mediawiki.org'
        self.diskcache = self._open_diskcache(cache_dir)

        self.sites = {}

        self.session = Session()
        # noinspection PyTypeChecker
        self.session.mount(
            'https://',
            HTTPAdapter(max_retries=Retry(total=3, backoff_factor=0.1, status_forcelist=[500, 502, 503, 504])))

        self.primary_site = self.get_site(self.primary_domain)
        self.sites_metadata: Dict[str, SiteMetadata] = self.diskcache.get('sites_metadata', {})

        self.wikidata = Sparql()

        # Template name -> domain -> localized template name
        self.template_map: TemplateCache = self.diskcache.get('template_map') or {}

        self.primary_pages_by_qid: Dict[str, PagePrimary] = self.diskcache.get('primary_pages_by_qid') or {}
        self.primary_pages_by_title: Dict[str, PagePrimary] = {v.title: v for v in self.primary_pages_by_qid.values()}
        self.syncinfo_by_qid_domain: Dict[str, Dict[str, SyncInfo]] = {
            v[len('info_by_qid:'):]: self.diskcache[v]
            for v in self.diskcache.keys()
            if v.startswith('info_by_qid:')}

        # Get sitelinks, and update self.primary_pages_by_qid
        wd_warnings = []
        sitelinks = self.query_wd_multilingual_pages(wd_warnings)
        # Update primary pages and templates cache
        self.update_primary_pages()
        # Download clones and compute sync info
        self.update_syncinfo(sitelinks, False)

        print('Done initializing')

    def query_wd_multilingual_pages(self,
                                    warnings: List[WdWarning],
                                    qids: List[str] = None
                                    ) -> List[WdSitelink]:
        """
        Find all sitelinks for the pages in Wikidata who's instance-of is Q63090714 (auto-synchronized pages)
        :return: a map of wikidata ID -> list of sitelinks
        """
        items_str = ''
        if qids:
            items_str = f' VALUES ?id {{ wd:{" wd:".join(qids)} }}'
        query = 'SELECT ?id ?sl WHERE {%%% ?id wdt:P31 wd:Q63090714. ?sl schema:about ?id. }'.replace('%%%', items_str)

        primaries = []
        copies = []
        for row in self.wikidata.query(query):
            qid = row['id']['value'][len('http://www.wikidata.org/entity/'):]
            res = parse_wd_sitelink(qid, row['sl']['value'], warnings)
            if res:
                if res.domain != self.primary_domain:
                    copies.append(res)
                else:
                    primaries.append(qid)
                    if qid not in self.primary_pages_by_qid:
                        self.primary_pages_by_qid[qid] = PagePrimary(qid, res.title, self.template_map)

        if not qids:
            # Remove primary pages that are no longer listed as multi-copiable in WD
            for old_key in set(self.primary_pages_by_qid.keys()).difference(primaries):
                del self.primary_pages_by_qid[old_key]

        # Update reverse lookup by title
        self.primary_pages_by_title = {v.title: v for v in self.primary_pages_by_qid.values()}

        if not qids:
            self.diskcache['primary_pages_by_qid'] = self.primary_pages_by_qid

        return copies

    def update_primary_pages(self, page: Optional[PagePrimary] = None):
        pages_to_update = self.primary_pages_by_qid.values() if page is None else [page]
        # Load primary page revision history from cache if needed
        for page in pages_to_update:
            if not page.history:
                page.history = self.diskcache.get(f"primary:{page.title}") or []
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
            if not page.history or page.history[-1].revid != revid:
                self.primary_site.load_page_history(page.title, page.history, revid)
                self.diskcache[f"primary:{page.title}"] = page.history
        # Load dependencies of the primary pages
        self.update_template_cache(pages_to_update)

    def update_syncinfo(self, sitelinks: Iterable[WdSitelink], refresh) -> List[Tuple[str, str, PageContent]]:
        infos = self.syncinfo_by_qid_domain
        if not refresh:
            sitelinks = filter(lambda v: v.qid not in infos or v.domain not in infos[v.qid], sitelinks)
        qid_by_domain_title = dict_of_dicts(sitelinks, lambda v: v.domain, lambda v: v.title, lambda v: v.qid)
        result = []
        changed_qid = set()
        for domain, titles_qid in sorted(qid_by_domain_title.items(), key=lambda v: v[0]):
            for title, page in self.get_page_content(domain, titles_qid.keys(), refresh):
                result.append((domain, title, page))
                qid = titles_qid[title]
                old_revid = 0 if qid not in infos or domain not in infos[qid] else infos[qid][domain].dst_revid
                is_same = (page is None and old_revid == 0) or (page is not None and old_revid == page.revid)
                if not is_same:
                    changed_qid.add(qid)
                    primary = self.primary_pages_by_qid[qid]
                    if page is None:
                        info = SyncInfo(primary.qid, primary.title, domain, title)
                    else:
                        info = primary.compute_sync_info(primary.qid, page, self.sites_metadata[domain])
                    update_dict_of_dicts(infos, primary.qid, domain, info)
        for qid in changed_qid:
            self.diskcache[f'info_by_qid:{qid}'] = infos[qid]
        return result

    def update_template_cache(self, pages: Iterable[PagePrimary]):
        # Template name -> domain -> localized template name
        titles: Set[str] = set()
        for page in pages:
            for rev in page.history:
                titles.update(page.parse_dependencies(rev.content))

        # Ask source to resolve titles
        normalized = {}
        redirects = {}
        for batch in batches(titles, 50):
            res = next(self.primary_site.query(titles=batch, redirects=True))
            if 'normalized' in res:
                normalized.update({v['from']: v.to for v in res.normalized})
            if 'redirects' in res:
                redirects.update({v['from']: v.to for v in res.redirects})

        # redirect targets
        # + normalization results without redirects
        # + titles without redirects and without normalizations
        # and remove all the ones already in cache
        unknowns = set(redirects.values()) \
            .union(set(normalized.values()).difference(redirects.keys())) \
            .union(titles.difference(redirects.keys()).difference(normalized.keys())) \
            .difference(self.template_map)

        if unknowns:
            vals = " ".join(
                {v: f'<{title_to_url(self.primary_domain, v)}>'
                 for v in unknowns}.values())
            query = f'''\
    SELECT ?id ?sl ?ismult
    WHERE {{ 
      VALUES ?mw {{ {vals} }}
      ?mw schema:about ?id.
      ?sl schema:about ?id.
      BIND( EXISTS {{?id wdt:P31 wd:Q63090714}} AS ?ismult)
    }}'''
            query_result = self.wikidata.query(query)
            qid_clones = []
            qid_primary = {}
            for row in query_result:
                qid = row['id']['value'][len('http://www.wikidata.org/entity/'):]
                is_multi = bool(row['ismult']['value'])
                res = parse_wd_sitelink(qid, row['sl']['value'])
                if res:
                    if res.domain == self.primary_domain:
                        qid_primary[qid] = res.title
                        self.template_map[res.title] = TemplateReplacements(qid, is_multi, {})
                    else:
                        qid_clones.append(res)
            for row in qid_clones:
                self.template_map[qid_primary[row.qid]].domain_to_title[row.domain] = row.title

        for frm, to in chain(redirects.items(), normalized.items()):
            if to not in self.template_map:
                self.template_map[frm] = TemplateReplacements(None, False, {})
            # elif frm in self.template_map:
            #     raise ValueError(f'Logic error - {frm} is already cached')
            else:
                self.template_map[frm] = self.template_map[to]

        # Ensure all titles are present in cache
        for t in titles:
            if t not in self.template_map:
                self.template_map[t] = TemplateReplacements(None, False, {})

        self.diskcache['template_map'] = self.template_map

    @staticmethod
    def _open_diskcache(cache_dir):
        cache_dir = Path(cache_dir)
        cache_dir.mkdir(parents=True, exist_ok=True)

        def my_encode(obj):
            try:
                if isinstance(obj, list) and obj and isinstance(obj[0], RevComment):
                    enc_obj = [v.encode() for v in obj]
                else:
                    enc_obj = obj
                return dumps(enc_obj, ensure_ascii=False)
            except TypeError:
                return sqlite3.Binary(zlib.compress(pickle.dumps(obj, pickle.HIGHEST_PROTOCOL)))

        def my_decode(obj):
            try:
                obj = loads(obj)
            except:
                return pickle.loads(zlib.decompress(bytes(obj)))
            if isinstance(obj, list) and obj and isinstance(obj[0], dict) and 'comment' in obj[0]:
                obj = [RevComment.decode(v) for v in obj]
            return obj

        return SqliteDict(cache_dir / 'cache.sqlite', autocommit=True, encode=my_encode, decode=my_decode)

    def get_site(self, domain: str) -> WikiSite:
        try:
            return self.sites[domain]
        except KeyError:
            # noinspection PyTypeChecker
            site = WikiSite(domain, self.session, domain == self.primary_domain)
            self.sites[domain] = site
            return site

    def get_page_content(self,
                         domain: str,
                         titles: Iterable[str],
                         refresh=False
                         ) -> Generator[TitlePagePair, None, None]:
        site = self.get_site(domain)

        cached_pages = {}
        unresolved: Set[str] = set()
        for title in titles:
            page = self.diskcache.get(title_to_url(site.domain, title))
            if page:
                cached_pages[title] = page
            else:
                unresolved.add(title)

        if cached_pages:
            if refresh:
                for title, revid in site.query_pages_revid(cached_pages.keys()):
                    cache_title = title_to_url(site.domain, title)
                    page = cached_pages.pop(title)
                    if revid == 0:
                        del self.diskcache[cache_title]
                        yield title, None
                    elif revid != page.revid:
                        del self.diskcache[cache_title]
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
                    del self.diskcache[cache_title]
                else:
                    self.diskcache[cache_title] = page
                yield title, page

    def get_metadata(self, domain: str) -> SiteMetadata:
        self.update_metadata([domain])
        return self.sites_metadata[domain]

    def update_metadata(self, domains: Iterable[str]) -> None:
        updated = False
        for domain in domains:
            md = self.sites_metadata.get(domain)
            if not md or (datetime.utcnow() - md.last_updated) > timedelta(days=30):
                self.sites_metadata[domain] = self.get_site(domain).query_metadata()
                updated = True
        if updated:
            self.diskcache['sites_metadata'] = self.sites_metadata

    def get_data(self):
        def info_obj(p: SyncInfo):
            res = dict(title=p.dst_title)
            if p.no_changes:
                res['status'] = 'ok'
            elif p.diverged is not None:
                res['status'] = 'diverged'
                res['diverged'] = p.diverged
            elif p.needs_refresh:
                res['status'] = 'needs_refresh'
            elif p.behind:
                res['status'] = 'outdated'
                res['behind'] = p.behind
            else:
                raise ValueError(f"Unexpected item status for {p}")
            if p.not_multisite_deps:
                res['not_multisite_deps'] = p.not_multisite_deps
            if p.multisite_deps_not_on_dst:
                res['multisite_deps_not_on_dst'] = p.multisite_deps_not_on_dst
            return res

        print(f"Getting sync info")
        return [dict(
            id=qid,
            primarySite=self.primary_domain,
            primaryTitle=self.primary_pages_by_qid[qid].title,
            copies={domain: info_obj(info) for domain, info in obj.items()}
        ) for qid, obj in self.syncinfo_by_qid_domain.items()]

    def get_page(self, qid: str, domain: str):
        print(f"Getting page {qid} / {domain}")
        info = self.syncinfo_by_qid_domain[qid][domain]
        _, _, page = self.update_syncinfo([WdSitelink(qid, domain, info.dst_title)], True)[0]
        if page is None:
            return None
        # sync info might have changed, re-get it
        info = self.syncinfo_by_qid_domain[qid][domain]
        return dict(
            currentText=page.content,
            currentRevId=page.revid,
            newText=info.new_content,
            changed_by_users=info.changed_by_users,
            all_comments=info.all_comments,
        )
