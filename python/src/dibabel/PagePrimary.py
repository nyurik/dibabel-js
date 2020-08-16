import re
from sys import intern
from typing import Iterable, Optional
from typing import List
from typing import Tuple, Set

from pywikiapi import ApiError

from .DataTypes import RevComment, SyncInfo, Translations
from .DataTypes import TemplateCache, SiteMetadata
from .PageContent import PageContent
from .WikiSite import WikiSite
# Find any string that is a template name
# Must be preceded by two {{ (not 3!), must be followed by either "|" or "}", must not include any funky characters
from .utils import limit_ellipsis, calc_hash

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
        result = SyncInfo('',
                          qid,
                          src_title=self.title,
                          dst_domain=page.domain,
                          dst_title=page.title,
                          dst_timestamp=page.content_ts,
                          dst_protection=page.protection)
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

    def create_summary(self, site: WikiSite, info: SyncInfo, i18n_messages: Translations) -> Optional[str]:
        summary_link = f'[[mw:{self.title}]]'
        lang = info.dst_domain.split('.', 1)[0]

        if info.status == 'outdated':
            changes = self.history[-info.behind:]
            # dict keeps the order
            users = list({v.user: '' for v in changes}.keys())
            comments = list({v.comment: '' for v in changes if v.comment}.keys())
            # Copying $1 changes by $2: "$3" from $4
            i18n = i18n_messages['edit_summary']
            text = i18n[lang if lang in i18n else 'en']
            text = text.replace('$1', str(len(changes)))
            text = text.replace('$2', limit_ellipsis(','.join(users), 80))
            text = text.replace('$3', limit_ellipsis(','.join(comments), 210))
            text = text.replace('$4', summary_link)
        elif info.status in ('unlocalized', 'diverged'):
            i18n = i18n_messages['localized_summary' if info.status == 'unlocalized' else 'reset_summary']
            text = i18n[lang if lang in i18n else 'en']
            text = text.replace('$1', summary_link)
        else:
            return None

        try:
            res = site(action='expandtemplates', text=text, prop='wikitext')
        except ApiError as err:
            print(err)
            raise err

        # for some reason template expansions add \n in some places
        return res.expandtemplates.wikitext.replace('\n', '')

    def parse_dependencies(self, content) -> Iterable[str]:
        if self.is_module:
            # strip first and last quote symbol
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
