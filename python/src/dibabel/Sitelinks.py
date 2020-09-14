from datetime import timedelta
from typing import Iterable, Dict, List

from .DataTypes import TitleSitelinks, WdWarning, Title
from .SessionState import SessionState
from .utils import batches, title_to_url, parse_wd_sitelink, parse_qid, primary_domain


class Sitelinks:
    _cache_key = 'title_sitelinks'
    _warnings: List[WdWarning]

    # Template name -> domain -> localized template name
    _sitelinks: Dict[Title, TitleSitelinks]
    _ttl: timedelta

    def __init__(self, state: SessionState, warnings: List[WdWarning]):
        self._state = state
        self._warnings = warnings
        self._ttl = timedelta(hours=1)
        self._sitelinks = state.load_obj(self._cache_key) or {}

    def __getitem__(self, title: Title) -> TitleSitelinks:
        return self._sitelinks[title]

    def refresh(self, titles: Iterable[Title]) -> None:
        # Ask source to resolve titles
        normalized = {}
        redirects = {}
        missing = set()
        pages = set()
        for batch in batches(sorted(set(titles)), 50):
            res = next(self._state.primary_site.query(titles=batch, redirects=True))
            if 'normalized' in res:
                normalized.update({v['from']: v.to for v in res.normalized})
            if 'redirects' in res:
                redirects.update({v['from']: v.to for v in res.redirects})
            for v in res.pages:
                if 'missing' in v:
                    missing.add(v['title'])
                else:
                    pages.add(v['title'])

        qid_primary, qid_copies = self._query_wikidata(pages)

        for title in pages:
            if title not in self._sitelinks:
                self._sitelinks[title] = TitleSitelinks(None, title, 'no_wd', {})

        for frm, to in redirects.items():
            try:
                self._sitelinks[frm] = self._sitelinks[to]
            except KeyError:
                self._sitelinks[frm] = TitleSitelinks(None, frm, 'missing', {})

        for frm, to in normalized.items():
            try:
                self._sitelinks[frm] = self._sitelinks[to]
            except KeyError:
                # Save normalized title
                self._sitelinks[frm] = TitleSitelinks(None, to, 'missing', {})

        # Ensure all titles are present in cache
        for title in missing:
            if title not in self._sitelinks:
                self._sitelinks[title] = TitleSitelinks(None, title, 'missing', {})

        # Update sitelinks for copies
        for row in qid_copies:
            self._sitelinks[qid_primary[row.qid]].domain_to_title[row.domain] = row.title

        self._state.save_obj(self._cache_key, self._sitelinks)

    def _query_wikidata(self, titles: Iterable[Title]):
        values = "\n".join((f'<{title_to_url(primary_domain, v)}>' for v in titles))
        query = f'''\
SELECT ?id ?sl ?is_multi ?is_non_multi
WHERE {{ 
  VALUES ?mw {{
{values}
  }}
  ?mw schema:about ?id.
  ?sl schema:about ?id.
  BIND( EXISTS {{?id wdt:P31 wd:Q63090714}} AS ?is_multi)
  BIND( EXISTS {{?id wdt:P31 wd:Q98545791}} AS ?is_non_multi)
}}'''

        query_result = self._state.wikidata.query(query)
        qid_copies = []
        qid_primary = {}

        for row in query_result:
            qid = parse_qid(row)
            is_multi = row['is_multi']['value'] == 'true'
            is_non_multi = row['is_non_multi']['value'] == 'true'
            res = parse_wd_sitelink(qid, row['sl']['value'])
            if res:
                if res.domain == primary_domain:
                    qid_primary[qid] = res.title
                    status = 'sync' if is_multi else 'manual_sync' if is_non_multi else 'no_sync'
                    self._sitelinks[res.title] = TitleSitelinks(qid, res.title, status, {})
                else:
                    qid_copies.append(res)

        return qid_primary, qid_copies
