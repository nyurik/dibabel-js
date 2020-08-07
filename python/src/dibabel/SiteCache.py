from json import dumps, loads
from pathlib import Path

from requests import Session
from requests.adapters import HTTPAdapter
# noinspection PyUnresolvedReferences
from requests.packages.urllib3.util.retry import Retry
from sqlitedict import SqliteDict

from .Site import Site
from .utils import RevComment


class SiteCache:
    def __init__(self, source, cache_dir):
        self.sites = {}
        self.site_tokens = {}

        self.session = Session()
        # noinspection PyTypeChecker
        self.session.mount(
            'https://',
            HTTPAdapter(max_retries=Retry(total=3, backoff_factor=0.1, status_forcelist=[500, 502, 503, 504])))

        cache_dir = Path(cache_dir)
        cache_dir.mkdir(parents=True, exist_ok=True)

        # from diskcache import Cache
        # self.diskcache = Cache(cache_dir)

        def my_encode(obj):
            if isinstance(obj, list) and obj and isinstance(obj[0], RevComment):
                obj = [v.encode() for v in obj]
            return dumps(obj, ensure_ascii=False)

        def my_decode(obj):
            obj = loads(obj)
            if isinstance(obj, list) and obj and isinstance(obj[0], dict) and 'comment' in obj[0]:
                obj = [RevComment.decode(v) for v in obj]
            return obj

        self.diskcache = SqliteDict(cache_dir / 'cache.sqlite', autocommit=True, encode=my_encode, decode=my_decode)

        self.primary_site_url = f'https://{source}'
        self.primary_site = self.get_site(self.primary_site_url)

    def get_site(self, site_url: str) -> Site:
        try:
            return self.sites[site_url]
        except KeyError:
            # noinspection PyTypeChecker
            site = Site(site_url, self.session, self.diskcache, site_url == self.primary_site_url)
            self.sites[site_url] = site
            return site

    def token(self, site: Site) -> str:
        try:
            return self.site_tokens[site]
        except KeyError:
            token = site.token()
            self.site_tokens[site] = token
            return token
