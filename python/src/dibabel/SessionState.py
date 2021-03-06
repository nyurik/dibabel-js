import random
from datetime import datetime
from pathlib import Path
from pickle import loads, dumps
from typing import Any, Optional

from redis import Redis
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from requests.sessions import Session
from sqlitedict import SqliteDict

from .DataTypes import Domain
from .Sparql import Sparql
from .WikiSite import WikiSite
from .utils import primary_domain


def create_session(user_requested: bool, redis="tools-redis.svc.eqiad.wmflabs"):
    # Path to the cache file
    cache_file = Path('../cache/cache.sqlite')
    # This should be changed every time database schema is changed
    db_version = "eO14i1AM"

    return SessionState(cache_file, db_version, redis, user_requested=user_requested)


class SessionState:
    def __init__(self, cache_file: Path, cache_key: str, redis: str, user_requested=False):
        self.user_requested = user_requested
        self._cache_file = cache_file
        self._cache_key = cache_key
        self._cache: Optional[SqliteDict] = None
        random.seed()
        self._session_key = random.randint(0, 999999)
        self._redis = Redis(host=redis)

        if not user_requested:
            self._open()
            if self._cache_key != self._cache.get("_cache_key_", None):
                self._cache.close()
                self._cache: Optional[SqliteDict] = None
                self._cache_file.unlink()
                self._open()
                self._cache["_cache_key_"] = self._cache_key

        self.session = Session()
        # noinspection PyTypeChecker
        self.session.mount(
            'https://',
            HTTPAdapter(max_retries=Retry(total=3, backoff_factor=0.1, status_forcelist=[500, 502, 503, 504])))
        self.sites = {}
        self.wikidata = Sparql()
        self.primary_site = self.get_site(primary_domain)

    def __enter__(self):
        return self

    def __exit__(self, typ, value, traceback):
        self.session.close()
        if self._cache is not None:
            self._cache.close()
            self._cache = None
            print(f'Closed SQL connection for {self._session_key} at {datetime.utcnow()}')

    def _open(self):
        if self._cache is None:
            print(f'Opening SQL connection for {self._session_key} at {datetime.utcnow()}')
            self._cache_file.parent.mkdir(parents=True, exist_ok=True)
            self._cache = SqliteDict(self._cache_file, autocommit=True)

    def get_site(self, domain: Domain) -> WikiSite:
        try:
            return self.sites[domain]
        except KeyError:
            # noinspection PyTypeChecker
            site = WikiSite(domain, self.session, domain == primary_domain)
            if self.user_requested:
                site.maxlag = None
            self.sites[domain] = site
            return site

    def delete_cached_items(self, prefix: str) -> None:
        self._open()
        for vv in {v for v in self._cache.keys() if v.startswith(prefix)}:
            del self._cache[vv]

    def del_obj(self, key: str) -> Any:
        self._redis.delete(self.redis_key(key))
        self._open()
        print(f"%% del {key}")
        return self._cache.pop(key, None)

    def load_obj(self, key: str, default: Any = None) -> Any:
        value = self._redis.get(self.redis_key(key))
        if value is not None:
            return loads(value)
        self._open()
        print(f"%% load {key}")
        value = self._cache.get(key, default)
        self._redis.set(self.redis_key(key), dumps(value))
        return value

    def save_obj(self, key: str, value: Any):
        self._open()
        print(f"%% save {key}")
        self._cache[key] = value
        self._redis.set(self.redis_key(key), dumps(value))

    def redis_key(self, key: str):
        return self._cache_key + key
