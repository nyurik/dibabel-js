from dataclasses import dataclass
from typing import Dict, List, Set, Optional, NewType

QID = NewType('QID', str)
Domain = NewType('Domain', str)
Title = NewType('Title', str)
RevID = NewType('RevID', int)
Timestamp = NewType('Timestamp', str)


@dataclass
class WdSitelink:
    qid: QID
    domain: Domain
    title: Title


@dataclass
class TitleSitelinks:
    qid: Optional[QID]
    normalizedTitle: Title
    # missing     - page does not exist at mediawiki.org
    # sync        - page is enabled for multi-site synchronization
    # manual_sync - page is specially tagged as synced by hand (e.g. Template:Documentation)
    # no_sync     - page is in Wikidata, but not marked for any type of syncing
    # no_wd       - page exists but does not have a wikidata entry
    pageType: str  # 'missing' | 'sync' | 'manual_sync' | 'no_sync' | 'no_wd'
    domain_to_title: Dict[Domain, Title]


@dataclass
class WdWarning:
    qid: QID
    url: str


@dataclass
class SiteMetadata:
    magic_words: Set[str]
    magic_prefixes: Set[str]
    flagged_revisions: bool
    template_ns: str
    module_ns: str

    def is_magic_keyword(self, name: Title):
        return name in self.magic_words or any(v for v in self.magic_prefixes if name.startswith(v))


@dataclass
class RevComment:
    user: str
    ts: Timestamp
    comment: str
    content: str
    revid: RevID


@dataclass
class SyncInfo:
    status: str  # 'ok' | 'outdated' | 'unlocalized' | 'diverged' | 'new'
    qid: QID
    src_title: Title
    dst_domain: Domain
    dst_title: Title
    dst_timestamp: Optional[Timestamp] = None
    dst_protection: Optional[List[str]] = None
    dst_revid: Optional[RevID] = None  # This sync info was generated when source had this RevID
    new_content: Optional[str] = None
    behind: Optional[int] = None
    matched_revid: Optional[RevID] = None
    hash: Optional[str] = None

    def __str__(self) -> str:
        return f"{self.status}: {self.src_title} -> {self.dst_domain}/wiki/{self.dst_title} " \
               f"({self.dst_revid}, #{self.hash})"


Translations = Dict[str, Dict[str, str]]
