from datetime import datetime, timedelta
from typing import Dict, List, Optional, Iterable, Tuple

from .DataTypes import WdWarning, QID, WdSitelink, Title
from .Metadata import Metadata
from .Primary import Primary
from .SessionState import SessionState
from .Sitelinks import Sitelinks
from .utils import parse_wd_sitelink, primary_domain, parse_qid, is_older_than


class PrimaryPages:
    _cache_key = 'primary_pages_by_qid'
    _ttl = timedelta(hours=1)

    def __init__(self, state: SessionState, metadata: Metadata, sitelinks: Sitelinks, warnings: List[WdWarning]):
        self._state = state
        self._metadata = metadata
        self._sitelinks = sitelinks
        self._warnings: List[WdWarning] = warnings

        self._primary_pages_by_qid: Dict[QID, Primary] = state.cache.get(self._cache_key) or {}
        if is_older_than(state.get_cache_ts(self._cache_key), self._ttl):
            new_primaries = self._query_primaries()
            # Remove primary pages that are no longer listed as multi-copiable in WD
            for old_key in set(self._primary_pages_by_qid.keys()).difference(new_primaries.keys()):
                del self._primary_pages_by_qid[old_key]
            # Create new primary pages
            for qid, sl in new_primaries.items():
                if qid not in self._primary_pages_by_qid:
                    primary = Primary(qid, sl.title)
                    primary.load_history(state, self._metadata[primary_domain])
                    self._primary_pages_by_qid[qid] = primary
            self._state.cache[self._cache_key] = self._primary_pages_by_qid
            self._state.update_cache_ts(self._cache_key)

        # Update reverse lookup by title
        self._primary_pages_by_title: Dict[Title, Primary] = {
            v.title: v for v in self._primary_pages_by_qid.values()
        }

    def get_page(self, qid: QID, load_history=False) -> Primary:
        page = self._primary_pages_by_qid[qid]
        if load_history:
            page.load_history(self._state, self._metadata[primary_domain])
        return page

    def get_all(self) -> Iterable[Tuple[QID, Primary]]:
        return self._primary_pages_by_qid.items()

    def _query_primaries(self) -> Dict[QID, WdSitelink]:
        query = '''\
SELECT ?id ?sl WHERE {
  ?id wdt:P31 wd:Q63090714.
  ?sl schema:about ?id;
      schema:isPartOf <https://%%%/>.
}'''.replace('%%%', primary_domain)
        return {v.qid: v
                for v in [
                    parse_wd_sitelink(parse_qid(row), row['sl']['value'], self._warnings)
                    for row in self._state.wikidata.query(query)]
                if v}

    def refresh(self, qid: Optional[QID] = None) -> None:
        primary_metadata = self._metadata[primary_domain]
        if qid is None:
            pages_to_query = [v for v in self._primary_pages_by_qid.values()
                              if is_older_than(v.refreshed_ts, self._ttl)]
            if not pages_to_query:
                return
        else:
            pages_to_query = [self._primary_pages_by_qid[qid]]

        # Find latest available revisions for primary pages, and cleanup if does not exist
        pages_to_load: List[Primary] = []
        for title, revid in self._state.primary_site.query_pages_revid((v.title for v in pages_to_query)):
            if revid == 0:
                page = self._primary_pages_by_title.pop(title)
                del self._primary_pages_by_qid[page.qid]
            else:
                page = self._primary_pages_by_title[title]
                page.refreshed_ts = datetime.utcnow()
                if page.last_rev_id != revid:
                    page.last_rev_id = revid
                    pages_to_load.append(page)

        # Load primary page revision history from cache if needed
        for page in pages_to_load:
            page.load_history(self._state, primary_metadata)
            hist = self._state.primary_site.load_page_history(page.title, page.history)
            if hist:
                page.add_to_history(hist, primary_metadata)
                page.save_history(self._state)

        # Load sitelinks for both primary pages and their dependencies
        titles = set((v.title for v in pages_to_load))
        for page in pages_to_load:
            titles.update(page.historic_dependencies)
        if titles:
            self._sitelinks.refresh(titles)

        self._state.cache[self._cache_key] = self._primary_pages_by_qid
