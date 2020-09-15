from typing import Optional, List, Dict

# noinspection PyUnresolvedReferences
from requests.packages.urllib3.util.retry import Retry

from .DataTypes import Domain, QID
from .Metadata import Metadata
from .PrimaryPages import PrimaryPages
from .SessionState import SessionState
from .Sitelinks import Sitelinks
from .Synchronizer import Synchronizer


class Controller:
    def __init__(self, state: SessionState):
        self._state = state
        self._wd_warnings = []
        self._metadata = Metadata(state)
        self._sitelinks = Sitelinks(state, self._wd_warnings)
        self._primaries = PrimaryPages(state, self._metadata, self._sitelinks, self._wd_warnings)
        self._synchronizer = Synchronizer(state, self._primaries, self._sitelinks, self._metadata)

    def get_data(self) -> Dict[str, List[dict]]:
        return self._synchronizer.get_syncinfo()

    def get_page(self, qid: QID, domain: Domain) -> Optional[dict]:
        page, info = self._synchronizer.update_syncinfo(qid, domain)
        result = self._synchronizer.get_syncinfo(qid)
        primary = self._primaries.get_page(qid)

        content = dict(
            changeType=info.status,
            domain=domain,
            qid=qid,
            title=primary.title,
        )
        if info.status != 'ok':
            content['newText'] = info.new_content
        if page is not None:
            content['currentText'] = page.content
            content['currentRevId'] = page.revid
            content['currentRevTs'] = page.content_ts
            if info.status == 'outdated':
                content['changes'] = [dict(
                    user=v.user,
                    ts=v.ts,
                    comment=v.comment,
                    revid=v.revid
                ) for v in primary.history[-info.behind:]]

        result['content'] = content
        return result

    def refresh_state(self):
        wd_warnings = []
        self._metadata.refresh()
        # Download content of all copies and compute sync info
        self._synchronizer.update_syncinfo()
