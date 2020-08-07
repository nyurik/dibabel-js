import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Union, List

from urllib.parse import unquote

reUrl = re.compile(r'^(?P<site>https://[a-z0-9-_.]+)/wiki/(?P<title>[^?#]+)$', re.IGNORECASE)


@dataclass
class RevComment:
    user: str
    ts: datetime
    comment: str
    content: str
    revid: int

    def encode(self):
        return dict(
            user=self.user,
            ts=self.ts.timestamp(),
            comment=self.comment,
            content=self.content,
            revid=self.revid,
        )

    @staticmethod
    def decode(obj):
        return RevComment(
            obj['user'],
            datetime.utcfromtimestamp(obj['ts']),
            obj['comment'],
            obj['content'],
            obj['revid'],
        )


@dataclass
class SyncInfo:
    qid: str
    src: 'SourcePage'
    dst_site: 'Site'
    dst_title: str
    new_content: Union[str, None] = None
    no_changes: bool = False
    needs_refresh: bool = False
    changed_by_users: List[str] = None
    all_comments: List[str] = None
    behind: Union[int, None] = None
    diverged: Union[str, None] = None
    not_multisite_deps: Union[List[str], None] = None
    multisite_deps_not_on_dst: Union[List[str], None] = None

    def __str__(self) -> str:
        return f"{self.src} -> {self.dst_site}/wiki/{self.dst_title}"


def list_to_dict_of_sets(items, key, value=None):
    result = defaultdict(set)
    for item in items:
        k = key(item)
        if k:
            result[k].add(value(item) if value else item)
    return result


def parse_page_urls(sites, page_urls: Iterable[str], qid=None, silent=False):
    bad_urls = []
    source = None
    targets = {}
    for url in sorted(page_urls):
        match = reUrl.match(url)
        if not match:
            bad_urls.append(url)
            continue
        site_url = match.group('site')
        title = unquote(match.group('title')).replace('_', ' ')
        if site_url == 'https://www.mediawiki.org':
            source = title
        else:
            targets[sites.get_site(site_url)] = title
    if not source:
        raise ValueError(f'Unable to find source page for {qid}')
    if bad_urls and not silent:
        print(f'WARN: unable to parse urls:\n  ' + '\n  '.join(bad_urls))
    return source, targets, bad_urls


def batches(items: Iterable, batch_size: int):
    res = []
    for value in items:
        res.append(value)
        if len(res) >= batch_size:
            yield res
            res = []
    if res:
        yield res
