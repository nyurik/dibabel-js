import random
from datetime import datetime
from pathlib import Path

from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from requests.sessions import Session
from sqlitedict import SqliteDict

from .DataTypes import Domain
from .Sparql import Sparql
from .WikiSite import WikiSite
from .utils import primary_domain


class SessionState:
    def __init__(self, cache_file: Path, user_requested=False):
        self.user_requested = user_requested
        random.seed()
        self.key = random.randint(0, 999999)
        print(f'Opening SQL connection for {self.key} at {datetime.utcnow()}')
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        self.cache = SqliteDict(cache_file, autocommit=True)
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
        self.cache.close()
        self.session.close()
        print(f'Closed SQL connection for {self.key} at {datetime.utcnow()}')

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
        for vv in {v for v in self.cache.keys() if v.startswith(prefix)}:
            del self.cache[vv]

    def get_cache_ts(self, key: str) -> datetime:
        return self.cache.get(f'{key}:ts')

    def update_cache_ts(self, key: str) -> None:
        self.cache[f'{key}:ts'] = datetime.utcnow()
