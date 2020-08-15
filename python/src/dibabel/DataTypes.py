from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Set, Optional


@dataclass
class WdSitelink:
    qid: str
    domain: str
    title: str


@dataclass
class TemplateReplacements:
    qid: Optional[str]
    is_multisite: bool
    domain_to_title: Dict[str, str]


@dataclass
class WdWarning:
    qid: str
    url: str


@dataclass
class SiteMetadata:
    last_updated: datetime
    magic_words: Set[str]
    magic_prefixes: Set[str]
    flagged_revisions: bool


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
    status: str  # missing | ok | outdated | diverged | unlocalized
    qid: str
    src_title: str
    dst_domain: str
    dst_title: str
    dst_timestamp: Optional[str] = None
    dst_protection: Optional[List[str]] = None
    dst_revid: Optional[int] = None
    new_content: Optional[str] = None
    behind: Optional[int] = None
    matched_revid: Optional[int] = None
    not_multisite_deps: Optional[List[str]] = None
    multisite_deps_not_on_dst: Optional[List[str]] = None
    hash: Optional[str] = None

    def __str__(self) -> str:
        return f"{self.status}: {self.src_title} -> {self.dst_domain}/wiki/{self.dst_title} " \
               f"({self.dst_revid}, #{self.hash})"


TemplateCache = Dict[str, TemplateReplacements]

Timestamp = str

Translations = Dict[str, Dict[str, str]]
