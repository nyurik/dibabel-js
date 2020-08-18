import json
from pathlib import Path

from dibabel.QueryCache import QueryCache

cache = QueryCache('../cache')


def main():
    with cache.create_session(user_requested=True) as state:
        print('starting')
        # res = cache.get_data(state)
        # fauxData = Path('../../js/src/contexts/faux/fauxData.json')
        # fauxData.write_text(json.dumps(res, ensure_ascii=False, indent=2) + '\n')
        # print('got data')
        res = cache.get_page(state, 'Q63324398', 'he.wikipedia.org')
        print(repr(res))
        # res = cache.get_page(state, 'Q3926051', 'ab.wikipedia.org')
    print('got item')


main()
