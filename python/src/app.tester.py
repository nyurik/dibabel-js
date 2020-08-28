import json
from pathlib import Path

from dibabel.QueryCache import QueryCache

cache = QueryCache('../cache')


def main():
    print('starting...')
    with cache.create_session(user_requested=True) as state:

        # del state.cache['title_sitelinks']
        # del state.cache['sites_metadata']

        save('all', cache.get_data(state))
        save('ok-Q63324398-zh', cache.get_page(state, 'Q63324398', 'zh.wikipedia.org'))
        save('unlocalized-Q63324398-ace', cache.get_page(state, 'Q63324398', 'ace.wikipedia.org'))
        save('diverged-Q63324398-bcl', cache.get_page(state, 'Q63324398', 'bcl.wikipedia.org'))
        save('outdated2-Q63324398-de', cache.get_page(state, 'Q63324398', 'de.wikipedia.org'))
        save('new-Q63324398-ab', cache.get_page(state, 'Q63324398', 'ab.wikipedia.org'))


def save(name, res):
    data = Path(f'../../js/src/services/faux/{name}.json')
    data.write_text(json.dumps(res, ensure_ascii=False, indent=2) + '\n')
    print(f'saved {name}')


main()
