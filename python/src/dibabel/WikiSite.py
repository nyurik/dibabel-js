import re
from datetime import datetime
from json import dumps
from typing import List, Iterable, Tuple

from pywikiapi import Site, AttrDict
# noinspection PyUnresolvedReferences
from requests import Session

from .DataTypes import RevComment, SiteMetadata
from .PageContent import PageContent, TitlePagePair

reDomain = re.compile(r'^(?P<lang>[a-z0-9-_]+)\.(?P<project>[a-z0-9-_]+)\.org$', re.IGNORECASE)


class WikiSite(Site):

    def __init__(self, domain: str, session: Session, is_primary: bool):
        super().__init__(f'http://{domain}/w/api.php', session=session, json_object_hook=AttrDict)
        self.retry_on_lag_error = 30
        self.is_primary = is_primary
        self.domain = domain

        m = reDomain.match(domain)
        if not m:
            raise ValueError(f"Unable to parse domain '{domain}'")
        self.lang = m.group('lang')
        self.project = m.group('project')

    def query_metadata(self) -> SiteMetadata:
        res = next(self.query(meta='siteinfo', siprop=('magicwords', 'extensions')))

        # Only remember template-like magic words (uppercase, don't begin with a "_")
        words = [vvv for vv in
                 (v.aliases for v in res.magicwords if v['case-sensitive'])
                 for vvv in vv if re.match(r'^[A-Z!]', vvv)]

        # those that end with a colon allow arbitrary text afterwards
        magic_words = set((v for v in words if not v.endswith(':')))
        magic_prefixes = set(words) - magic_words

        flagged_revisions = \
            bool([v for v in res.extensions if 'descriptionmsg' in v and v.descriptionmsg == 'flaggedrevs-desc'])

        return SiteMetadata(datetime.utcnow(), magic_words=magic_words, magic_prefixes=magic_prefixes,
                            flagged_revisions=flagged_revisions)

    def query_pages_revid(self, titles: Iterable[str]) -> Iterable[Tuple[str, int]]:
        for data in self.query_pages(prop=['info'], titles=titles):
            yield data['title'], 0 if 'missing' in data else data['lastrevid']

    def query_pages_content(self, titles: Iterable[str]) -> Iterable[TitlePagePair]:
        props = ['content', 'timestamp', 'ids']
        # if self.get_metadata().flagged_revisions:
        #     props.append('flagged')
        for page in self.query_pages(
                prop=['revisions', 'info'],
                rvprop=props,
                inprop=['protection'],
                rvslots='main',
                titles=titles):
            if 'missing' in page:
                yield page.title, None
                continue
            protection = [p.level for p in page.protection if p.type == 'edit']
            rev = page.revisions[0]
            # if self.get_metadata().flagged_revisions:
            #     TODO
            yield page.title, PageContent(
                self.domain,
                page.title,
                rev.revid,
                rev.slots.main.content,
                datetime.fromisoformat(rev.timestamp.rstrip('Z')),
                protection=list(set(protection)) or None,
            )

    def load_page_history(self, title: str, history: List[RevComment], current_revid: int) -> None:
        # Load all of history
        if not history or history[0].revid != current_revid:
            params = dict(
                prop='revisions',
                rvprop=['user', 'comment', 'timestamp', 'content', 'ids'],
                rvlimit=25,
                rvslots='main',
                rvdir='newer',
                titles=title,
            )
            if history:
                params['rvstart'] = history[-1].ts
            # there could (in theory) be more than one revision at the same timestamp,
            # ensure we don't duplicate
            rev_ids = set((v.revid for v in history))
            for result in self.query(**params):
                for r in result.pages[0].revisions:
                    if r.revid not in rev_ids:
                        rev = RevComment(r.user, datetime.fromisoformat(r.timestamp.rstrip('Z')), r.comment.strip(),
                                         r.slots.main.content, r.revid)
                        history.append(rev)

    def __str__(self):
        return self.domain

    # FIXME: remove this
    def request(self, method, force_ssl=False, headers=None, **request_kw):
        print(f'{self}: {dumps(request_kw, ensure_ascii=False)}')
        return super().request(method, force_ssl, headers, **request_kw)
