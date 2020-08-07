from datetime import datetime
from sys import intern
from typing import Union


class ContentPage:
    def __init__(self, site: 'Site', title: str, revid: int = 0, content: str = None, content_ts: datetime = None):
        self.site = site
        self.title = title
        self.revid = revid
        self._content = intern(content)
        self._content_ts = content_ts

    def get_content(self) -> Union[str, None]:
        self._ensure_content()
        return self._content

    def get_content_ts(self) -> datetime:
        self._ensure_content()
        return self._content_ts

    def _ensure_content(self):
        if self._content is not None:
            return
        _, _, content, self._content_ts = next(self.site.download_content([self.title]))
        self._content = intern(content)

    def __str__(self):
        return f'{self.site.domain}/wiki/{self.title}'
