import hashlib
import re
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Iterable, List, Optional, TypeVar, Callable, Dict
from urllib.parse import unquote, quote

from pywikiapi.utils import to_timestamp, to_datetime
# noinspection PyUnresolvedReferences
from requests.packages.urllib3.util.retry import Retry

from .DataTypes import Timestamp
from .DataTypes import WdSitelink, \
    WdWarning

T = TypeVar('T')
T1 = TypeVar('T1')
T2 = TypeVar('T2')
T3 = TypeVar('T3')


def list_to_dict_of_sets(items, key, value=None):
    result = defaultdict(set)
    for item in items:
        k = key(item)
        if k:
            result[k].add(value(item) if value else item)
    return result


def batches(items: Iterable, batch_size: int):
    res = []
    for value in items:
        res.append(value)
        if len(res) >= batch_size:
            yield res
            res = []
    if res:
        yield res


def is_older_than(timestamp: Timestamp, value: timedelta) -> bool:
    return (datetime.utcnow() - to_datetime(timestamp)) > value


def now_ts() -> Timestamp:
    return to_timestamp(datetime.utcnow())


def title_to_url(domain: str, title: str):
    return f'https://{domain}/wiki/' + quote(title.replace(" ", "_"), ": &=+/")


reUrl = re.compile(r'^https://(?P<site>[a-z0-9-_.]+)/wiki/(?P<title>[^?#]+)$', re.IGNORECASE)


def parse_wd_sitelink(qid: str, url: str, warnings: List[WdWarning] = None) -> Optional[WdSitelink]:
    match = reUrl.match(url)
    if match:
        return WdSitelink(qid, match.group('site'), unquote(match.group('title')).replace('_', ' '))
    if warnings:
        warnings.append(WdWarning(qid, url))
    return None


def update_dict_of_dicts(dictionary: Dict[T1, Dict[T2, T3]], key1: T1, key2: T2, value: T3) -> None:
    obj = dictionary.get(key1)
    if obj:
        obj[key2] = value
    else:
        dictionary[key1] = {key2: value}


def dict_of_dicts(items: Iterable[T],
                  extract_key1: Callable[[T], T1],
                  extract_key2: Callable[[T], T2],
                  extract_value: Callable[[T], T3] = None
                  ) -> Dict[T1, Dict[T2, T3]]:
    result = {}
    for v in items:
        k1 = extract_key1(v)
        k2 = extract_key2(v)
        if k1 is None or k2 is None:
            continue
        val = extract_value(v) if extract_value else v
        update_dict_of_dicts(result, k1, k2, val)
    return result


def limit_ellipsis(text: str, max_len: int) -> str:
    return text if len(text) < max_len else (text[:max_len] + '…')


def calc_hash(content):
    m = hashlib.sha1()
    m.update(content.encode())
    return m.hexdigest()
