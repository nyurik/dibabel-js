import re
from datetime import datetime
from sys import intern
from typing import List
from typing import Optional, Callable
from typing import Set

from .DataTypes import RevComment, SyncInfo, QID, Title, Domain, RevID
from .DataTypes import SiteMetadata
from .PageContent import PageContent
from .SessionState import SessionState
from .Sitelinks import Sitelinks
from .utils import calc_hash

# Find any string that is a template name
# Must be preceded by two {{ (not 3!), must be followed by either "|" or "}", must not include any funky characters
reTemplateName = re.compile(r'''((?:^|[^{]){{\s*)([^|{}<>&#:]*[^|{}<>&#: ])(\s*[|}])''')

# Find any require('Module:name') and mw.loadData('Module:name')
# must be preceded by a space or an operation like = or a comma.
reModuleName = re.compile(r'''((?:^|\s|=|,|\()(?:require|mw\.loadData)\s*\(\s*)('[^']+'|"[^"]+")(\s*\))''')


def to_template(name):
    if name.startswith('Template:'):
        return name
    elif name.startswith('template:'):
        return 'T' + name[1:]
    else:
        return 'Template:' + name


well_known_lua_modules = {
    'libraryUtil'
}


def ignore_modules(name: str):
    return name in well_known_lua_modules


def replace_module_deps(content: str,
                        target_domain: Domain,
                        title_sitelinks: Sitelinks,
                        ignore: Callable[[Title], bool],
                        ) -> str:
    def sub_module(m):
        name = m.group(2)
        fullname = name[1:-1]  # strip first and last quote symbol

        if ignore(fullname):
            return m.group(0)

        obj = title_sitelinks[fullname]
        try:
            repl = obj.domain_to_title[target_domain]
        except KeyError:
            return m.group(0)

        # The "Module:" namespace should stay unlocalized in modules per user request.
        # The domain_to_title will still be localized because it might be used in templates(?).
        # Keeping the namespace as it was written originally (first letter casing).
        repl = fullname.split(':', 1)[0] + ':' + repl.split(':', 1)[1]

        quote = name[0]
        if quote not in repl:
            name = quote + repl + quote
        else:
            quote = '"' if quote == "'" else "'"
            if quote not in repl:
                name = quote + repl + quote
            else:
                name = "'" + repl.replace("'", "\\'") + "'"

        return m.group(1) + name + m.group(3)

    return reModuleName.sub(sub_module, content)


def replace_template_deps(content: str,
                          target_domain: Domain,
                          title_sitelinks: Sitelinks,
                          ignore: Callable[[Title], bool],
                          ) -> str:
    def sub_template(m):
        name = m.group(2)
        if ignore(name):
            return m.group(0)
        obj = title_sitelinks[to_template(name)]
        try:
            name = obj.domain_to_title[target_domain].split(':', maxsplit=1)[1]
        except KeyError:
            return m.group(0)

        return m.group(1) + name + m.group(3)

    return reTemplateName.sub(sub_template, content)


class Primary:
    _cache_prefix = 'history:'

    def __init__(self, qid: QID, title: Title):
        self.qid = qid
        self.title = title
        self.is_module = self.title.startswith('Module:')
        self.history: Optional[List[RevComment]] = None
        # Dependencies found in the entire history of this page, non-normalized
        self.historic_dependencies: Optional[Set[Title]] = None
        # Dependencies found in the most recent page version
        self.dependencies: Optional[Set[Title]] = None
        self.refreshed_ts: Optional[datetime] = None
        self.last_rev_id: Optional[RevID] = None

    def __str__(self) -> str:
        return f"{self.title}"

    @property
    def last_revision(self) -> RevComment:
        return self.history[-1]

    def set_history(self, history: List[RevComment], metadata: SiteMetadata) -> None:
        self.history = []
        self.historic_dependencies = set()
        self.add_to_history(history, metadata)

    def add_to_history(self, history: List[RevComment], metadata: SiteMetadata) -> None:
        # assume history is going from oldest to newest
        # assume the data is already de-duplicated
        deps = None
        for rev in history:
            self.history.append(rev)
            deps = self.parse_dependencies(rev.content, metadata)
            self.historic_dependencies.update(deps)
        if deps is not None:
            self.dependencies = deps

    def load_history(self, state: SessionState, metadata: SiteMetadata) -> None:
        if not self.history:
            self.set_history(state.load_obj(f"{self._cache_prefix}{self.title}") or [], metadata)

    def save_history(self, state: SessionState) -> None:
        state.save_obj(f"{self._cache_prefix}{self.title}", self.history)

    def compute_sync_info(self, qid: QID, page: PageContent, metadata: SiteMetadata,
                          title_sitelinks: Sitelinks) -> SyncInfo:
        """
        Finds a given content in master revision history, and returns a list of all revisions since then
        :return: If the target's current revision was found in source's history, List of revisions changed since then,
                 the new content for the target, and a set of the missing templates/modules
        """
        assert self.history

        changes = []
        current_content = page.content.rstrip()
        result = SyncInfo('',
                          qid,
                          src_title=self.title,
                          dst_domain=page.domain,
                          dst_title=page.title,
                          dst_timestamp=page.content_ts,
                          dst_protection=page.protection)

        for hist in reversed(self.history):
            adj = self.localize_content(hist.content, metadata, page.domain, title_sitelinks)

            if result.new_content is None:
                # Comparing current revision of the primary page
                result.new_content = intern(adj)
                result.dst_revid = hist.revid
                # Latest revision must match adjusted content
                if adj.rstrip() == current_content:
                    # Latest matches what we expect - nothing to do, stop
                    result.hash = calc_hash(hist.content)
                    result.status = 'ok'
                    break
                elif hist.content.rstrip() == current_content:
                    # local template was renamed without any changes in primary
                    # the hash is the same as for 'ok'
                    result.hash = calc_hash(hist.content)
                    result.status = 'unlocalized'
                    break
            elif adj.rstrip() == current_content or hist.content.rstrip() == current_content:
                # One of the previous revisions matches current state of the target
                result.matched_revid = hist.revid
                result.behind = len(changes)
                result.hash = calc_hash(hist.content)
                result.status = 'outdated'
                break
            changes.append(hist)
        else:
            # Diverged content: current target content was not found in primary's history
            result.hash = calc_hash(current_content)
            result.status = 'diverged'

        assert result.status != ''
        return result

    def parse_dependencies(self, content, metadata: SiteMetadata) -> Set[Title]:
        if self.is_module:
            # strip first and last quote symbol
            return set(v for v in (vv[1][1:-1] for vv in reModuleName.findall(content))
                       if not ignore_modules(v))
        else:
            return set(to_template(v[1]) for v in reTemplateName.findall(content)
                       if not metadata.is_magic_keyword(v[1]))

    def localize_content(self, content, metadata: SiteMetadata, target_domain: Domain,
                         title_sitelinks: Sitelinks) -> str:
        if self.is_module:
            return replace_module_deps(content, target_domain, title_sitelinks, ignore_modules)
        else:
            return replace_template_deps(content, target_domain, title_sitelinks, metadata.is_magic_keyword)
