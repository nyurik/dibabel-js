from dibabel.QueryCache import QueryCache
from dibabel.SiteCache import SiteCache

cache = QueryCache(SiteCache('www.mediawiki.org', '../cache'))


def main():
    res = cache.get_data()
    res = cache.get_page('Q28132212', 'en.wikipedia.org')


main()
