from dibabel.QueryCache import QueryCache

cache = QueryCache('../cache')


def main():
    print('starting')
    res = cache.get_data()
    print('got data')
    res = cache.get_page('Q28132212', 'en.wikipedia.org')
    print('got item')
main()
