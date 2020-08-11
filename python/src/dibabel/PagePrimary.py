import hashlib
import re
from sys import intern
from typing import Iterable, Optional
from typing import List
from typing import Tuple, Set

from .DataTypes import RevComment, SyncInfo
from .DataTypes import TemplateCache, SiteMetadata
from .PageContent import PageContent

# Find any string that is a template name
# Must be preceded by two {{ (not 3!), must be followed by either "|" or "}", must not include any funky characters
reTemplateName = re.compile(r'''((?:^|[^{]){{\s*)([^|{}<>&#:]*[^|{}<>&#: ])(\s*[|}])''')

# Find any require('Module:name') and mw.loadData('Module:name')
# must be preceded by a space or an operation like = or a comma.
reModuleName = re.compile(r'''((?:^|\s|=|,|\()(?:require|mw\.loadData)\s*\(\s*)('[^']+'|"[^"]+")(\s*\))''')

well_known_lua_modules = {
    'libraryUtil'
}


class PagePrimary:
    def __init__(self, qid: str, title: str, template_map: TemplateCache):
        self.qid = qid
        self.title = title
        self.is_module = self.title.startswith('Module:')
        self.history: Optional[List[RevComment]] = None
        self.template_map = template_map

    def __str__(self) -> str:
        return f"{self.title}"

    def compute_sync_info(self, qid: str, page: PageContent, metadata: SiteMetadata) -> SyncInfo:
        """
        Finds a given content in master revision history, and returns a list of all revisions since then
        :return: If the target's current revision was found in source's history, List of revisions changed since then,
                 the new content for the target, and a set of the missing templates/modules
        """
        if not self.history:
            raise ValueError(f"History has not been populated for {self}")

        changes = []
        result = SyncInfo(qid, self.title, page.domain, page.title)
        current_content = page.content.rstrip()
        for hist in reversed(self.history):
            if self.is_module:
                adj, missing_on_dst, not_shared = self.replace_module_deps(
                    hist.content, page.domain)
            else:
                adj, missing_on_dst, not_shared = self.replace_template_deps(
                    hist.content, page.domain, metadata)

            if result.new_content is None:
                # Comparing current revision of the primary page
                result.new_content = intern(adj)
                result.dst_revid = hist.revid
                result.multisite_deps_not_on_dst = list(missing_on_dst)
                result.not_multisite_deps = list(not_shared)
                # Latest revision must match adjusted content
                if adj.rstrip() == current_content:
                    # Latest matches what we expect - nothing to do, stop
                    result.no_changes = True
                    break
                elif hist.content.rstrip() == current_content:
                    # local template was renamed without any changes in primary
                    result.needs_refresh = True
                    break
            elif adj.rstrip() == current_content or hist.content.rstrip() == current_content:
                # One of the previous revisions matches current state of the target
                result.matched_revid = hist.revid
                result.behind = len(changes)
                result.changed_by_users = list({v.user: '' for v in changes}.keys())
                result.all_comments = list({v.comment: '' for v in changes if v.comment}.keys())
                break
            changes.append(hist)
        else:
            # Diverged content: current target content was not found in primary's history
            m = hashlib.sha256()
            m.update(current_content.encode())
            result.diverged = m.hexdigest()

        return result

    # def create_summary(self, changes: List[RevComment], lang: str, summary_i18n: Dict[str, str]) -> str:
    #     summary_link = f'[[mw:{self.title}]]'
    #     if changes:
    #         # dict keeps the order
    #         users = list({v.user: '' for v in changes}.keys())
    #         comments = list({v.comment: '' for v in changes if v.comment}.keys())
    #         # Copying $1 changes by $2: "$3" from $4
    #         text = summary_i18n[lang if lang in summary_i18n else 'en']
    #         text = text.replace('$1', str(len(changes)))
    #         text = text.replace('$2', ','.join(users))
    #         text = text.replace('$3', ', '.join(comments))
    #         text = text.replace('$4', summary_link)
    #
    #         res = self.site(
    #             action='expandtemplates',
    #             text=text,
    #             prop='wikitext')
    #
    #         # for some reason template expansions add \n in some places
    #         return res.expandtemplates.wikitext.replace('\n', '')
    #     else:
    #         # Restoring to the current version of {0}
    #         return f'Restoring to the current version of {summary_link}'

    def parse_dependencies(self, content) -> Iterable[str]:
        if self.is_module:
            return (v for v in (vv[1][1:-1] for vv in reModuleName.findall(content))
                    if v not in well_known_lua_modules)
        else:
            return ('Template:' + v[1] for v in reTemplateName.findall(content))

    def replace_module_deps(self,
                            content: str,
                            target_domain: str
                            ) -> Tuple[str, Set[str], Set[str]]:
        multisite_deps_not_on_dst = set()
        not_multisite_deps = set()

        def sub_module(m):
            name = m.group(2)
            fullname = name[1:-1]  # strip first and last quote symbol

            try:
                obj = self.template_map[fullname]
                if not obj.is_multisite:
                    not_multisite_deps.add(fullname)
                repl = obj.domain_to_title[target_domain]
                quote = name[0]
                if quote not in repl:
                    name = quote + repl + quote
                else:
                    quote = '"' if quote == "'" else "'"
                    if quote not in repl:
                        name = quote + repl + quote
                    else:
                        name = "'" + repl.replace("'", "\\'") + "'"
            except KeyError:
                if fullname not in well_known_lua_modules:
                    multisite_deps_not_on_dst.add(fullname)

            return m.group(1) + name + m.group(3)

        return reModuleName.sub(sub_module, content), multisite_deps_not_on_dst, not_multisite_deps

    def replace_template_deps(self,
                              content: str,
                              target_domain: str,
                              metadata: SiteMetadata) -> Tuple[str, Set[str], Set[str]]:
        multisite_deps_not_on_dst = set()
        not_multisite_deps = set()

        def sub_template(m):
            name = m.group(2)
            if name not in metadata.magic_words and not any(
                    v for v in metadata.magic_prefixes if name.startswith(v)):
                fullname = 'Template:' + name
                try:
                    obj = self.template_map[fullname]
                    if not obj.is_multisite:
                        not_multisite_deps.add(fullname)
                    name = obj.domain_to_title[target_domain].split(':', maxsplit=1)[1]
                except KeyError:
                    multisite_deps_not_on_dst.add(fullname)
            return m.group(1) + name + m.group(3)

        return reTemplateName.sub(sub_template, content), multisite_deps_not_on_dst, not_multisite_deps
