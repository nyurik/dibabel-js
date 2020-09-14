from collections import defaultdict
from sys import intern
from typing import Dict, Optional, Iterable, Generator, Set, Tuple

from .DataTypes import QID, SyncInfo, Domain
from .Metadata import Metadata
from .PageContent import TitlePagePair, PageContent
from .PrimaryPages import PrimaryPages
from .SessionState import SessionState
from .Sitelinks import Sitelinks
from .utils import calc_hash, title_to_url, primary_domain


class Synchronizer:
    _cache_prefix = "info_by_qid:"

    def __init__(self, state: SessionState, primaries: PrimaryPages, sitelinks: Sitelinks, metadata: Metadata):
        self._state = state
        self._primaries = primaries
        self._sitelinks = sitelinks
        self._metadata = metadata
        self._infos: Dict[QID, Dict[Domain, SyncInfo]] = {}
        self._modified_qids: Set[QID] = set()

    def get_info_by_qid(self, qid: QID) -> Dict[Domain, SyncInfo]:
        try:
            return self._infos[qid]
        except KeyError:
            self._infos[qid] = self._state.load_obj(f'{self._cache_prefix}{qid}', {})
            return self._infos[qid]

    def update_syncinfo(self, qid: QID = None, domain: Domain = None) -> Optional[Tuple[PageContent, SyncInfo]]:
        """
        Update sync info either for everything or just a single one.
        For single link return page content and sync info
        """
        if qid is not None:
            self._primaries.refresh(qid)
            info = self.get_info_by_qid(qid).get(domain)
            if info:
                title = info.dst_title
            else:
                # Requested copy does not exist. Assuming client wants to create a new copy.
                # Need to generate the new title using localized namespaces.
                meta = self._metadata[domain]
                primary = self._primaries.get_page(qid)
                ns = meta.module_ns if primary.is_module else meta.template_ns
                title = ns + ":" + primary.title.split(':', 1)[1]
            qid_by_domain_title = {domain: {title: qid}}
        else:
            qid_by_domain_title = defaultdict(dict)
            for qid, page in self._primaries.get_all():
                links = self._sitelinks[page.title]
                inf = self.get_info_by_qid(qid)
                for domain, title in links.domain_to_title.items():
                    if not inf or domain not in inf or inf[domain].dst_revid != page.last_rev_id:
                        qid_by_domain_title[domain][title] = qid

        # Refresh by domain because we want to get all page statuses with one API call
        last_result = None
        for domain, titles_qid in sorted(qid_by_domain_title.items(), key=lambda v: v[0]):
            for title, page in self._get_page_content(domain, titles_qid.keys(), refresh=qid is not None):
                qid = titles_qid[title]
                inf = self.get_info_by_qid(qid)
                if not inf or domain not in inf:
                    old_revid = 0
                else:
                    old_revid = inf[domain].dst_revid
                if page is not None and old_revid == page.revid:
                    info = inf[domain]
                else:
                    primary = self._primaries.get_page(qid, load_history=True)
                    metadata = self._metadata[domain]
                    if page is None:
                        last_rev = primary.last_revision
                        info = SyncInfo(
                            'new', primary.qid, primary.title, primary.last_rev_id, domain, title,
                            new_content=intern(
                                primary.localize_content(last_rev.content, metadata, domain, self._sitelinks)),
                            hash=calc_hash(last_rev.content))
                    else:
                        info = primary.compute_sync_info(primary.qid, page, metadata, self._sitelinks)
                        self._update_info(primary.qid, domain, info)
                last_result = (page, info)

        self._save_updated_infos()

        return None if qid is None else last_result

    def get_syncinfo(self, single_qid: Optional[str] = None) -> Dict[str, any]:
        if single_qid is None:
            qids = set(self._primaries.get_all_qids())
        else:
            qids = {single_qid}

        # Keep iterating until it finds no new dependent pages
        other_deps = set()
        found = 0
        while found != len(qids):
            found = len(qids)
            for qid in list(qids):
                page = self._primaries.get_page(qid)
                for dep in page.dependencies:
                    sl = self._sitelinks[dep]
                    if sl.pageType == 'sync':
                        qids.add(sl.qid)
                    else:
                        other_deps.add(sl.normalizedTitle)

        pages = []
        for qid in qids:
            page = self._primaries.get_page(qid)
            pages.append(dict(
                primaryTitle=page.title,
                type=self._sitelinks[page.title].pageType,
                primarySite=primary_domain,
                qid=qid,
                primaryRevId=page.last_revision.revid,
                dependencies=[
                    vv.normalizedTitle
                    for vv in [self._sitelinks[v] for v in page.dependencies]],
                copies=[self._info_obj(info) for info in self.get_info_by_qid(qid).values()]
            ))

        for dep in sorted(other_deps):
            sl = self._sitelinks[dep]
            obj = dict(
                primaryTitle=sl.normalizedTitle,
                type=sl.pageType,
                primarySite=primary_domain,
            )
            if sl.qid is not None:
                obj['qid'] = sl.qid
            if sl.pageType == 'manual_sync' or sl.pageType == 'no_sync':
                obj['copies'] = [dict(domain=d, title=t) for d, t in sl.domain_to_title.items()]
            pages.append(obj)

        return dict(pages=pages)

    def _get_page_content(self,
                          domain: Domain,
                          titles: Iterable[str],
                          refresh=False
                          ) -> Generator[TitlePagePair, None, None]:
        site = self._state.get_site(domain)

        cached_pages = {}
        unresolved: Set[str] = set()
        for title in titles:
            page = self._state.load_obj(title_to_url(site.domain, title))
            if page:
                cached_pages[title] = page
            else:
                unresolved.add(title)

        if cached_pages:
            if refresh:
                for title, revid in site.query_pages_revid(cached_pages.keys()):
                    cache_title = title_to_url(site.domain, title)
                    page = cached_pages.pop(title)
                    if revid == 0:
                        self._state.del_obj(cache_title)
                        yield title, None
                    elif revid != page.revid:
                        self._state.del_obj(cache_title)
                        unresolved.add(title)
                    else:
                        yield page.title, page
                if cached_pages:
                    raise ValueError('Unexpected titles not found: ' + ', '.join(cached_pages.keys()))
            else:
                yield from cached_pages.items()

        if unresolved:
            for title, page in site.query_pages_content(unresolved):
                cache_title = title_to_url(site.domain, title)
                if page is None:
                    self._state.del_obj(cache_title)  # ok if doesn't exist
                else:
                    self._state.save_obj(cache_title, page)
                yield title, page

    @staticmethod
    def _info_obj(p: SyncInfo):
        res = dict(domain=p.dst_domain, title=p.dst_title, status=p.status)
        if p.hash:
            res['hash'] = p.hash
        if p.dst_timestamp:
            res['timestamp'] = p.dst_timestamp
        if p.behind:
            res['behind'] = p.behind
            res['matchedRevId'] = p.matched_revid
        if p.dst_protection:
            res['protection'] = p.dst_protection
        return res

    def _update_info(self, qid: QID, domain: Domain, info: SyncInfo) -> None:
        self.get_info_by_qid(qid)[domain] = info
        self._modified_qids.add(qid)

    def _save_updated_infos(self) -> None:
        for qid in self._modified_qids:
            self._state.save_obj(f'{self._cache_prefix}{qid}', self._infos[qid])
        self._modified_qids.clear()
