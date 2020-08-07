import re
from datetime import datetime
from json import dumps
from typing import Generator
from urllib.parse import quote

from pywikiapi import Site as ApiSite, AttrDict
# noinspection PyUnresolvedReferences
from requests import Session

from .ContentPage import ContentPage
from .SourcePage import SourcePage

reSite = re.compile(r'^https://(?P<lang>[a-z0-9-_]+)\.(?P<project>[a-z0-9-_]+)\.org$', re.IGNORECASE)


class Site(ApiSite):

    def request(self, method, force_ssl=False, headers=None, **request_kw):
        print(f'{self}: {dumps(request_kw, ensure_ascii=False)}')
        return super().request(method, force_ssl, headers, **request_kw)

    def __init__(self, site_url: str, session: Session, diskcache: dict, is_primary: bool):
        super().__init__(f'{site_url}/w/api.php', session=session, json_object_hook=AttrDict)
        self.site_url = site_url
        self.is_primary = is_primary
        self.diskcache = diskcache
        self.magic_words = None
        self.flagged_revisions = None

        m = reSite.match(site_url)
        if not m:
            raise ValueError(f'*************** WARN: unable to parse {site_url}')
        self.lang = m.group('lang')
        self.project = m.group('project')
        if self.lang != 'www':
            self.domain = f"{self.lang}.{self.project}.org"
        else:
            self.domain = f'{self.project}.org'

    def get_magic_words(self):
        if self.magic_words is None:
            # Have not initialized yet
            res = next(self.query(meta='siteinfo', siprop='magicwords'))
            # Only remember template-like magic words (uppercase, don't begin with a "_")
            words = [vvv for vv in
                     (v.aliases for v in res.magicwords if v['case-sensitive'])
                     for vvv in vv if re.match(r'^[A-Z!]', vvv)]
            # those that end with a colon allow arbitrary text afterwards
            self.magic_words = (
                set((v for v in words if not v.endswith(':'))),
                set((v for v in words if v.endswith(':'))))
        return self.magic_words

    def has_flagged_revisions(self):
        if self.flagged_revisions is None:
            # Have not initialized yet
            res = next(self.query(meta='siteinfo', siprop='extensions'))
            self.flagged_revisions = \
                bool([v for v in res.extensions if 'descriptionmsg' in v and v.descriptionmsg == 'flaggedrevs-desc'])
            if self.flagged_revisions:
                print(f'{self} has enabled flagged revisions')
        return self.flagged_revisions

    def _new_page(self, args):
        return SourcePage(self.diskcache, self, *args) if self.is_primary else ContentPage(self, *args)

    def download_content(self, titles, refresh=False) -> Generator['ContentPage', None, None]:
        cached_pages = {}
        unresolved = []
        for title in titles:
            obj = self.diskcache.get(self.title_to_url(title))
            if obj:
                obj[3] = datetime.utcfromtimestamp(obj[3])
                cached_pages[title] = self._new_page(obj)
            else:
                unresolved.append(title)
        if refresh:
            for data in self.query_pages(prop=['info'], titles=cached_pages.keys()):
                title = data['title']
                cache_title = self.title_to_url(title)
                page = cached_pages.pop(title)
                if 'missing' in data:
                    del self.diskcache[cache_title]
                    yield self._new_page(data.title)
                elif data['lastrevid'] != page.revid:
                    del self.diskcache[cache_title]
                    unresolved.append(title)
                else:
                    yield page
            if cached_pages:
                raise ValueError('Unexpected titles not found: ' + ', '.join(cached_pages.keys()))
        else:
            yield from cached_pages.values()

        if not unresolved:
            return

        props = ['content', 'timestamp', 'ids']
        if self.has_flagged_revisions():
            props.append('flagged')
        for page in self.query_pages(
                prop=['revisions'],
                rvprop=props,
                rvslots='main',
                titles=unresolved):
            if 'missing' in page:
                yield self._new_page(page.title)
                continue
            rev = page.revisions[0]
            # if self.has_flagged_revisions():
            #     TODO
            obj = (
                page.title,
                rev.revid,
                rev.slots.main.content,
                datetime.fromisoformat(rev.timestamp.rstrip('Z')).timestamp(),
            )
            self.diskcache[self.title_to_url(page.title)] = obj
            yield self._new_page(obj)

    def title_to_url(self, title):
        return self.site_url + '/wiki/' + quote(title.replace(" ", "_"), ": &=+/")

    def __str__(self):
        return self.site_url
