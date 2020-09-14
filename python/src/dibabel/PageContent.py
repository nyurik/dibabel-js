from sys import intern
from typing import Tuple, Union, Optional, List

from .DataTypes import Domain, Title, RevID


class PageContent:
    def __init__(self, domain: Domain, title: Title, revid: RevID, content: str, content_ts: str,
                 protection: Optional[List[str]]):
        self.domain = domain
        self.title = title
        self.revid = revid
        self.content = intern(content)
        self.content_ts = content_ts
        self.protection = protection

    def __str__(self):
        return f'{self.domain}/wiki/{self.title}'


TitlePagePair = Tuple[str, Union[PageContent, None]]
