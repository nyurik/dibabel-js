import hashlib
import re
from datetime import datetime
from typing import Tuple, List, Dict, Set

from .ContentPage import ContentPage
from .utils import RevComment, SyncInfo

# Find any string that is a template name
# Must be preceded by two {{ (not 3!), must be followed by either "|" or "}", must not include any funky characters
reTemplateName = re.compile(r'''((?:^|[^{]){{\s*)([^|{}<>&#:]*[^|{}<>&#: ])(\s*[|}])''')

# Find any require('Module:name') and mw.loadData('Module:name')
# must be preceded by a space or an operation like = or a comma.
reModuleName = re.compile(r'''((?:^|\s|=|,|\()(?:require|mw\.loadData)\s*\(\s*)('[^']+'|"[^"]+")(\s*\))''')

well_known_lua_modules = {
    'libraryUtil'
}


class SourcePage(ContentPage):
    history: List[RevComment]

    def __init__(self, diskcache: dict, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.diskcache = diskcache
        self.is_module = self.title.startswith('Module:')
        self.cache_key = f'history:{self.title}'

        history: List[RevComment] = self.diskcache.get(self.cache_key, [])

        # Load all of history
        if not history or history[0].revid != self.revid:
            params = dict(
                prop='revisions',
                rvprop=['user', 'comment', 'timestamp', 'content', 'ids'],
                rvlimit=25,
                rvslots='main',
                rvdir='newer',
                titles=self.title,
            )
            if history:
                params['rvstart'] = history[0].ts
            for result in self.site.query(**params):
                history.extend(
                    (RevComment(v.user, datetime.fromisoformat(v.timestamp.rstrip('Z')), v.comment.strip(),
                                v.slots.main.content, v.revid)
                     for v in result.pages[0].revisions))
            # remove duplicates
            history = list({v.revid: v for v in history}.values())
            history.sort(key=lambda v: v.ts, reverse=True)

        self.diskcache[self.cache_key] = history
        self.history = history

    def find_new_revisions(self, template_map, qid: str, target: ContentPage) -> SyncInfo:
        """
        Finds a given content in master revision history, and returns a list of all revisions since then
        :return: If the target's current revision was found in source's history, List of revisions changed since then,
                 the new content for the target, and a set of the missing templates/modules
        """
        changes = []
        result = SyncInfo(qid, self, target)

        cur_content = target.get_content()
        if cur_content is None:
            return result

        for hist in self.history:
            adj, missing_on_dst, not_shared = self.replace_templates(template_map, hist.content, target.site)
            if result.new_content is None:
                # Comparing current revision of the primary page
                result.new_content = adj
                result.multisite_deps_not_on_dst = list(missing_on_dst)
                result.not_multisite_deps = list(not_shared)
                # Latest revision must match adjusted content
                if adj.rstrip() == cur_content.rstrip():
                    # Latest matches what we expect - nothing to do, stop
                    result.no_changes = True
                    break
                elif hist.content.rstrip() == cur_content.rstrip():
                    # local template was renamed without any changes in primary
                    result.needs_refresh = True
                    break
            elif adj.rstrip() == cur_content.rstrip() or hist.content.rstrip() == cur_content.rstrip():
                # One of the previous revisions matches current state of the target
                break
            changes.append(hist)
        else:
            m = hashlib.sha256()
            m.update(cur_content.encode())
            result.diverged = m.hexdigest()

        if not result.diverged:
            result.behind = len(changes)

        if changes:
            result.changed_by_users = list({v.user: '' for v in changes}.keys())
            result.all_comments = list({v.comment: '' for v in changes if v.comment}.keys())

        return result

    def create_summary(self, changes: List[RevComment], lang: str, summary_i18n: Dict[str, str]) -> str:
        summary_link = f'[[mw:{self.title}]]'
        if changes:
            # dict keeps the order
            users = list({v.user: '' for v in changes}.keys())
            comments = list({v.comment: '' for v in changes if v.comment}.keys())
            # Copying $1 changes by $2: "$3" from $4
            text = summary_i18n[lang if lang in summary_i18n else 'en']
            text = text.replace('$1', str(len(changes)))
            text = text.replace('$2', ','.join(users))
            text = text.replace('$3', ', '.join(comments))
            text = text.replace('$4', summary_link)

            res = self.site(
                action='expandtemplates',
                text=text,
                prop='wikitext')

            # for some reason template expansions add \n in some places
            return res.expandtemplates.wikitext.replace('\n', '')
        else:
            # Restoring to the current version of {0}
            return f'Restoring to the current version of {summary_link}'

    def replace_templates(self, template_map, content: str, target_site: 'Site') -> Tuple[str, Set[str], Set[str]]:
        multisite_deps_not_on_dst = set()
        not_multisite_deps = set()

        if self.is_module:

            def sub_module(m):
                name = m.group(2)
                fullname = name[1:-1]  # strip first and last quote symbol
                if fullname in template_map and 'not-shared' in template_map[fullname]:
                    not_multisite_deps.add(fullname)
                if fullname in template_map and target_site in template_map[fullname]:
                    repl = template_map[fullname][target_site]
                    quote = name[0]
                    if quote not in repl:
                        name = quote + repl + quote
                    else:
                        quote = '"' if quote == "'" else "'"
                        if quote not in repl:
                            name = quote + repl + quote
                        else:
                            name = "'" + repl.replace("'", "\\'") + "'"
                elif fullname not in well_known_lua_modules:
                    multisite_deps_not_on_dst.add(fullname)

                return m.group(1) + name + m.group(3)

            new_content = reModuleName.sub(sub_module, content)

        else:

            def sub_template(m):
                name = m.group(2)
                magic_words, magic_prefixes = self.site.get_magic_words()
                if name not in magic_words and not any(v for v in magic_prefixes if name.startswith(v)):
                    fullname = 'Template:' + name
                    if fullname in template_map and 'not-shared' in template_map[fullname]:
                        not_multisite_deps.add(fullname)
                    if fullname in template_map and target_site in template_map[fullname]:
                        name = template_map[fullname][target_site].split(':', maxsplit=1)[1]
                    else:
                        multisite_deps_not_on_dst.add(fullname)
                return m.group(1) + name + m.group(3)

            new_content = reTemplateName.sub(sub_template, content)

        return new_content, multisite_deps_not_on_dst, not_multisite_deps

    def parse_dependencies(self, content):
        if self.is_module:
            titles = (v for v in (vv[1][1:-1] for vv in reModuleName.findall(content))
                      if v not in well_known_lua_modules)
        else:
            titles = ('Template:' + v[1] for v in reTemplateName.findall(content))
        return titles
