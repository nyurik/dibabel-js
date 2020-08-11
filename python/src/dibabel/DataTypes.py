from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Union, List, Set, Tuple, Any, Optional


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
    qid: str
    src_title: str
    dst_domain: str
    dst_title: str
    dst_revid: Optional[int] = None
    new_content: Optional[str] = None
    no_changes: bool = False
    needs_refresh: bool = False
    changed_by_users: Optional[List[str]] = None
    all_comments: Optional[List[str]] = None
    behind: Union[int, None] = None
    matched_revid: Union[int, None] = None
    diverged: Optional[str] = None
    not_multisite_deps: Optional[List[str]] = None
    multisite_deps_not_on_dst: Union[List[str], None] = None

    def __str__(self) -> str:
        return f"{self.src_title} -> {self.dst_domain}/wiki/{self.dst_title} ({self.dst_revid})"


TemplateCache = Dict[str, TemplateReplacements]

Timestamp = str
