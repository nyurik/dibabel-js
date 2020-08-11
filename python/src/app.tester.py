import json
from dataclasses import dataclass
from pathlib import Path

import mwoauth
from dibabel.QueryCache import QueryCache


@dataclass
class OauthSecret:
    url: str
    consumer_token: str
    secret_token: str

with Path('../secret.json').open('r', encoding='utf-8') as stream:
    config = OauthSecret(**json.load(stream))

cache = QueryCache('../cache')


def main():

    mwoauth.initiate(config.url, create_consumer_token())
    # print('starting')
    # res = cache.get_data()
    # print('got data')
    # # res = cache.get_page('Q28132212', 'en.wikipedia.org')
    # with cache.create_session() as state:
    #     res = cache.get_page(state, 'Q3926051', 'ab.wikipedia.org')
    # print('got item')

def create_consumer_token():
    return mwoauth.ConsumerToken(config.consumer_token, config.secret_token)

main()
