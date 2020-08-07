from collections import defaultdict
from datetime import datetime, timedelta
from itertools import chain
from typing import List, Dict, Set, Iterable

from .Site import Site
from .SiteCache import SiteCache
from .SourcePage import SourcePage
from .Sparql import Sparql
from .utils import list_to_dict_of_sets, parse_page_urls, SyncInfo, batches

known_unshared = {'Template:Documentation'}


class QueryCache:
    max_stale_minutes = 60 * 24 * 5

    def __init__(self, site_cache: SiteCache):
        self.site_cache = site_cache
        self.wikidata = Sparql()
        self.primary_site = self.site_cache.primary_site
        self.qid_primary_page: Dict[str, SourcePage] = {}
        self.primary_title_qid: Dict[str, str] = {}
        self.qid_site_info: Dict[str, Dict[Site, SyncInfo]] = {}
        self.site_title_qid: Dict[Site, Dict[str, str]] = {}
        self.qid_site_title: Dict[str, Dict[Site, str]] = {}

        # Template name -> dict( language code -> localized template name )
        self.template_map: Dict[str, Dict[Site, str]] = {}

        self.refresh_data()

    def refresh_data(self):
        # Only refresh if older than N minutes, or if running first time
        # If first time, don't refresh database unless it is very old too
        last_refresh = datetime.utcfromtimestamp(
            self.site_cache.diskcache.get('last_refresh', 0))
        refresh = (datetime.utcnow() - last_refresh) > timedelta(minutes=self.max_stale_minutes)
        if self.qid_site_title and not refresh:
            return

        raw_data = self.find_pages_to_sync()
        # Tuple[qid:str, sourceTitle:str, targets:Dict[str,str], bad_urls:List[str]]
        parsed_items = [(qid, *parse_page_urls(self.site_cache, page_urls, qid)) for qid, page_urls in raw_data.items()]
        self.qid_site_title = {qid: targets for qid, _, targets, _ in parsed_items}

        site_title_qid = defaultdict(dict)
        for qid, tpl in self.qid_site_title.items():
            for site, title in tpl.items():
                site_title_qid[site][title] = qid
        self.site_title_qid = dict(site_title_qid)

        self.primary_title_qid = {sourceTitle: qid for qid, sourceTitle, _, _ in parsed_items}

        self.qid_primary_page = {}
        page: SourcePage
        dependencies: Set[str] = set()
        for page in self.primary_site.download_content([sourceTitle for _, sourceTitle, _, _ in parsed_items], refresh):
            self.qid_primary_page[self.primary_title_qid[page.title]] = page
            for hist in page.history:
                dependencies.update(page.parse_dependencies(hist.content))
        self.update_template_cache(dependencies)

        qid_site_info = defaultdict(dict)
        for site, titles in sorted(self.site_title_qid.items(), key=lambda v: (v[0].lang, v[0].project)):
            for page in site.download_content(titles.keys(), refresh):
                qid = self.site_title_qid[site][page.title]
                qid_site_info[qid][site] = self.qid_primary_page[qid].find_new_revisions(self.template_map, qid, page)
        self.qid_site_info = dict(qid_site_info)

        self.site_cache.diskcache['last_refresh'] = datetime.utcnow().timestamp()
        print('Refresh complete')

    def find_pages_to_sync(self, items: List[str] = None) -> Dict[str, List[str]]:
        """
        Find all sitelinks for the pages in Wikidata who's instance-of is Q63090714 (auto-synchronized pages)
        :return: a map of wikidata ID -> list of sitelinks
        """
        items_str = ''
        if items:
            items_str = f' VALUES ?id {{ wd:{" wd:".join(items)} }}'
        query = 'SELECT ?id ?sl WHERE {%%% ?id wdt:P31 wd:Q63090714. ?sl schema:about ?id. }'.replace('%%%', items_str)
        query_result = self.wikidata.query(query)
        todo = list_to_dict_of_sets(query_result,
                                    key=lambda v: v['id']['value'][len('http://www.wikidata.org/entity/'):],
                                    value=lambda v: v['sl']['value'])
        return todo

    def update_template_cache(self, titles: Iterable[str]):
        cache = {}
        titles = set(titles)

        # Ask source to resolve titles
        normalized = {}
        redirects = {}
        for batch in batches(titles, 50):
            res = next(self.primary_site.query(titles=batch, redirects=True))
            if 'normalized' in res:
                normalized.update({v['from']: v.to for v in res.normalized})
            if 'redirects' in res:
                redirects.update({v['from']: v.to for v in res.redirects})

        unknowns = set(redirects.values()) \
            .union(set(normalized.values()).difference(redirects.keys())) \
            .union(titles.difference(redirects.keys()).difference(normalized.keys())) \
            .difference(cache)

        vals = " ".join(
            {v: f'<{self.primary_site.title_to_url(v)}>'
             for v in unknowns}.values())
        query = f'''\
SELECT ?id ?sl ?ismult
WHERE {{ 
  VALUES ?mw {{ {vals} }}
  ?mw schema:about ?id.
  ?sl schema:about ?id.
  BIND( EXISTS {{?id wdt:P31 wd:Q63090714}} AS ?ismult)
}}'''
        query_result = Sparql().query(query)
        res = list_to_dict_of_sets(query_result,
                                   key=lambda v: (v['id']['value'], v['ismult']['value']),
                                   value=lambda v: v['sl']['value'])
        for res_key, values in res.items():
            key, vals, _ = parse_page_urls(self.site_cache, values)
            if key in cache:
                raise ValueError(f'WARNING: Logic error - {key} is already cached')
            cache[key] = vals
            if res_key[1] == 'false' and key not in known_unshared:
                cache[key]['not-shared'] = True
            unknowns.remove(key)

        for frm, to in chain(redirects.items(), normalized.items()):
            if to not in cache:
                cache[frm] = {'not-shared': True}
            elif frm in cache:
                raise ValueError(f'WARNING: Logic error - {frm} is already cached')
            else:
                cache[frm] = cache[to]

        for t in titles:
            if t not in cache:
                cache[t] = {}  # Empty dict will avoid replacements

        self.template_map = cache

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

        self.refresh_data()
        return [dict(
            id=qid,
            primarySite='www.mediawiki.org',
            primaryTitle=self.qid_primary_page[qid].title,
            copies={site.domain: info_obj(info) for site, info in site_info.items()}
        ) for qid, site_info in self.qid_site_info.items()]

    def get_page(self, qid: str, site: str):
        self.refresh_data()
        info = self.qid_site_info[qid][self.site_cache.sites['https://' + site]]
        current = info.dst_site.download_content([info.dst_title])
        return dict(
            currentText=current.get_content(),
            currentRevId=current.revid,
            newText=info.new_content,
            changed_by_users=info.changed_by_users,
            all_comments=info.all_comments,
        )
