//   async fetchModules() {
//     query = `
// PREFIX mw: <http://tools.wmflabs.org/mw2sparql/ontology#>
//
// SELECT
//
//   ?item
//   (str(?source) AS ?itemLabel)
//   ?itemTarget
//   ?base
//   (str(?parent) AS ?baseLabel)
//   ?baseTarget
//
// WHERE {
//   hint:Query hint:optimizer "None".
//
//   ?item wdt:P31 wd:Q63090714.
//
//   OPTIONAL {
//     ?itemTarget schema:about ?item;
//                 schema:isPartOf <https://en.wikipedia.org/>.
//   }
//
//   ?source schema:about ?item;
//           schema:isPartOf <https://www.mediawiki.org/>.
//
//   SERVICE <http://mw2sparql.toolforge.org/sparql> { ?source mw:includesPage ?parent. }
//
//   OPTIONAL {
//     ?parent schema:about ?base.
//     ?baseTarget schema:about ?base;
//                 schema:isPartOf <https://en.wikipedia.org/>.
//   }
// }
// ORDER BY (?itemLabel) (?baseLabe)`;
//   }
// }


const domainSuffix = '.org';
const titleUrlSuffix = '/wiki/';

export const getItems = async () => {
  const data = [
    {
      primarySite: 'mediawiki',
      primaryTitle: 'Module:TNT',
      copies: {
        'en.wikipedia': { title: 'Module:TNT', behind: 2 },
      },
    },
    {
      primarySite: 'mediawiki',
      primaryTitle: 'Module:TNT',
      copies: {
        'fr.wikipedia': { title: 'Module:No globals', behind: 0 },
        'en.wikipedia': { title: 'Module:No globals', behind: 4 },
        'ru.wikipedia': { title: 'Модуль:No globals', behind: 4 },
        'si.wikipedia': { title: 'Module:No globals', behind: 3 },
        'gr.wikipedia': { title: 'Module:No globals', diverged: '012abcdef' },
        'mr.wikipedia': { title: 'Module:No globals', diverged: '012abcdef' },
        'tr.wikipedia': { title: 'Module:No globals', diverged: 'deadbeaf' },
      },
    },
    {
      primarySite: 'mediawiki',
      primaryTitle: 'Template:Something',
      copies: {
        'en.wikipedia': { title: 'Template:Something', behind: 3 },
      },
    },
    {
      primarySite: 'mediawiki',
      primaryTitle: 'Module:No copies',
      copies: {},
    },
  ];

  function * flatten(data) {
    const splitNs = (t) => {
      const pos = t.indexOf(':');
      return [t.substring(0, pos).toLowerCase(), t.substring(pos + 1)];
    };
    for (let src of data) {
      const [type, srcTitle] = splitNs(src.primaryTitle);
      const srcTitleUrl = `https://${src.primarySite}${domainSuffix}${titleUrlSuffix}${src.primaryTitle}`;

      for (let dstSite of Object.keys(src.copies)) {
        const dst = src.copies[dstSite];
        yield {
          type,
          srcSite: src.primarySite,
          srcFullTitle: src.primaryTitle,
          srcTitle,
          srcTitleUrl,
          dstSite,
          dstFullTitle: dst.title,
          dstTitle: splitNs(dst.title)[1],
          dstTitleUrl: `https://${dstSite}${domainSuffix}${titleUrlSuffix}${dst.title}`,
          isInSync: dst.behind === 0,
          behind: dst.behind,
          diverged: !!dst.diverged,
        };
      }
    }
  }

  return Array.from(flatten(data));
};
