import requests


class Sparql:
    def __init__(self,
                 rdf_url='https://query.wikidata.org/bigdata/namespace/wdq/sparql'):
        self.rdf_url = rdf_url

    def query(self, sparql):
        headers = {
            'Accept': 'application/sparql-results+json',
            'User-Agent': 'Dibabel Bot (User:Yurik, YuriAstrakhan@gmail.com)'
        }
        r = requests.post(self.rdf_url, data={'query': sparql}, headers=headers)
        try:
            if not r.ok:
                print(r.reason)
                print(sparql)
                raise Exception(r.reason)
            return r.json()['results']['bindings']
        finally:
            r.close()
