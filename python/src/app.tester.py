from dibabel.QueryCache import QueryCache

cache = QueryCache('../cache')


def main():
    print('starting')
    res = cache.get_data()
    print('got data')
    # res = cache.get_page('Q28132212', 'en.wikipedia.org')
    with cache.create_session() as state:
        res = cache.get_page(state, 'Q3926051', 'ab.wikipedia.org')
    print('got item')


main()
