import json
from pathlib import Path

from dibabel.Controller import Controller
from dibabel.Primary import Primary
from dibabel.PrimaryPages import PrimaryPages
from dibabel.Synchronizer import Synchronizer

from dibabel.SessionState import create_session


def main():
    print('starting...')
    with create_session(user_requested=False, redis="localhost") as state:
        # state.delete_cached_items(PrimaryPages._cache_key)
        # state.delete_cached_items(Synchronizer._cache_prefix)
        # state.delete_cached_items(Primary._cache_prefix)

        ctrl = Controller(state)

        ctrl.refresh_state()
        # print(ctrl.get_data())
        # print(ctrl.get_page('Q63324398', 'zh.wikipedia.org'))
        # print(ctrl.get_page('Q63324398', 'ab.wikipedia.org'))

        save('all', ctrl.get_data())
        save('ok-Q63324398-zh', ctrl.get_page('Q63324398', 'zh.wikipedia.org'))
        save('unlocalized-Q63324398-ace', ctrl.get_page('Q63324398', 'ace.wikipedia.org'))
        save('diverged-Q63324398-bcl', ctrl.get_page('Q63324398', 'bcl.wikipedia.org'))
        save('outdated2-Q63324398-de', ctrl.get_page('Q63324398', 'de.wikipedia.org'))
        save('new-Q63324398-ab', ctrl.get_page('Q63324398', 'ab.wikipedia.org'))


def save(name, res):
    data = Path(f'../../js/src/services/faux/{name}.json')
    data.write_text(json.dumps(res, ensure_ascii=False, indent=2) + '\n')
    print(f'saved {name}')


main()
