from datetime import datetime, timedelta
from typing import Dict

from .DataTypes import SiteMetadata, Domain
from .SessionState import SessionState
from .utils import is_older_than


class Metadata:
    _cache_key = 'metadata'
    _ttl: timedelta = timedelta(days=30)

    def __init__(self, state: SessionState):
        self._state = state
        ts, val = state.load_obj(self._cache_key, (None, None))
        self._metadata_ts: datetime = ts
        self._metadata: Dict[Domain, SiteMetadata] = val or {}

    def __getitem__(self, domain: Domain) -> SiteMetadata:
        try:
            return self._metadata[domain]
        except KeyError:
            metadata = self._state.get_site(domain).query_metadata()
            self._metadata[domain] = metadata
            self._save()
            return metadata

    def refresh(self) -> None:
        if not is_older_than(self._metadata_ts, self._ttl):
            return
        for domain in sorted(self._metadata.keys()):
            self._metadata[domain] = self._state.get_site(domain).query_metadata()
        self._save()

    def _save(self):
        self._metadata_ts = datetime.utcnow()
        self._state.save_obj(self._cache_key, (self._metadata_ts, self._metadata))
