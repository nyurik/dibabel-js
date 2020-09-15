from datetime import datetime, timedelta
from typing import Dict, List, Iterable, Tuple

from .DataTypes import WdWarning, QID, WdSitelink, Title
from .Metadata import Metadata
from .Primary import Primary
from .SessionState import SessionState
from .Sitelinks import Sitelinks
from .utils import parse_wd_sitelink, primary_domain, parse_qid, is_older_than


class PrimaryPages:
    _cache_key = 'primaries_by_qid'
    _ttl = timedelta(minutes=3)

    def __init__(self, state: SessionState, metadata: Metadata, sitelinks: Sitelinks, warnings: List[WdWarning]):
        self._state = state
        self._metadata = metadata
        self._sitelinks = sitelinks
        self._warnings: List[WdWarning] = warnings

        ts, val = state.load_obj(self._cache_key, (None, None))
        self._primary_pages_by_qid_ts: datetime = ts
        self._primaries_by_qid: Dict[QID, Primary] = val or {}

        # Update reverse lookup by title
        self._primaries_by_title: Dict[Title, Primary] = {v.title: v for v in self._primaries_by_qid.values()}

        if is_older_than(self._primary_pages_by_qid_ts, self._ttl):
            primary_metadata = self._metadata[primary_domain]

            new_primaries = self._query_primaries()
            # Remove primary pages that are no longer listed as multi-copiable in WD
            for old_key in set(self._primaries_by_qid.keys()).difference(new_primaries.keys()):
                primary = self._primaries_by_qid.pop(old_key)
                del self._primaries_by_title[primary.title]

            # Create new primary pages
            for qid, sl in new_primaries.items():
                if qid not in self._primaries_by_qid:
                    primary = Primary(qid, sl.title)
                    primary.load_history(state, primary_metadata)
                    self._primaries_by_qid[qid] = primary
                    self._primaries_by_title[primary.title] = primary

            # Find latest available revisions for primary pages, and cleanup if does not exist
            primaries_to_load: List[Primary] = []
            for title, revid in self._state.primary_site.query_pages_revid(
                    (v.title for v in self._primaries_by_qid.values())):
                if revid == 0:
                    primary = self._primaries_by_title.pop(title)
                    del self._primaries_by_qid[primary.qid]
                else:
                    primary = self._primaries_by_title[title]
                    if primary.last_rev_id != revid:
                        primary.last_rev_id = revid
                        primaries_to_load.append(primary)

            if primaries_to_load:
                # These primary pages have been modified, load new revisions
                for primary in primaries_to_load:
                    primary.load_history(self._state, primary_metadata)
                    hist = self._state.primary_site.load_page_history(primary.title, primary.history)
                    if hist:
                        primary.add_to_history(hist, primary_metadata)
                        primary.save_history(self._state)

                # Load sitelinks for both primary pages and their dependencies
                titles = set((v.title for v in primaries_to_load))
                for primary in primaries_to_load:
                    titles.update(primary.historic_dependencies)
                self._sitelinks.refresh(titles)

                self._save()

    def _save(self):
        self._primary_pages_by_qid_ts = datetime.utcnow()
        self._state.save_obj(self._cache_key, (self._primary_pages_by_qid_ts, self._primaries_by_qid))

    def get_page(self, qid: QID, load_history=False) -> Primary:
        primary = self._primaries_by_qid[qid]
        if load_history:
            primary.load_history(self._state, self._metadata[primary_domain])
        return primary

    def get_all_qids(self) -> Iterable[QID]:
        return self._primaries_by_qid.keys()

    def get_all(self) -> Iterable[Tuple[QID, Primary]]:
        return self._primaries_by_qid.items()

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
