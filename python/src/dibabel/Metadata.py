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
        self._metadata: Dict[Domain, SiteMetadata] = state.cache.get(self._cache_key) or {}

    def __getitem__(self, domain: Domain) -> SiteMetadata:
        try:
            return self._metadata[domain]
        except KeyError:
            metadata = self._state.get_site(domain).query_metadata()
            self._metadata[domain] = metadata
            self._state.cache[self._cache_key] = self._metadata
            if len(self._metadata) == 1:
                self._state.update_cache_ts(self._cache_key)
            return metadata

    def refresh(self) -> None:
        if not is_older_than(self._state.cache.get('metadata:ts', datetime.min), self._ttl):
            return

        for domain in sorted(self._metadata.keys()):
            self._metadata[domain] = self._state.get_site(domain).query_metadata()

        self._state.cache[self._cache_key] = self._metadata
        self._state.update_cache_ts(self._cache_key)
