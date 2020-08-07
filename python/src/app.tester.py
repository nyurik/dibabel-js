import asyncio

from dibabel.QueryCache import QueryCache
from dibabel.SiteCache import SiteCache

cache = QueryCache(SiteCache('www.mediawiki.org', '../cache'))


async def main():
    res = await cache.get_data()
    res = await cache.get_page('Q28132212', 'en.wikipedia.org')


asyncio.run(main())
