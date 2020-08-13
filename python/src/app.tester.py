import json
from pathlib import Path

from dibabel.QueryCache import QueryCache

cache = QueryCache('../cache')


def main():
    with cache.create_session(user_requested=True) as state:
        print('starting')
        # res = cache.get_data(state)
        # Path('../../js/src/data/faux/fauxData.json').write_text(json.dumps(res, ensure_ascii=False, indent=2))
        # print('got data')
        res = cache.get_page(state, 'Q28132212', 'de.wikipedia.org')
        # res = cache.get_page(state, 'Q3926051', 'ab.wikipedia.org')
    print('got item')


main()
