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

  // TODO: REMOVE SLEEP!
  await new Promise(r => setTimeout(r, 500));

  const srcLuaText = `
--    {{#invoke:TNT | doc | Graph:Lines }}
--        uses https://commons.wikimedia.org/wiki/Data:Templatedata/Graph:Lines.tab
--        if the current page is Template:Graph:Lines/doc
--

local p = {}
local i18nDataset = 'I18n/Module:TNT.tab'

-- Forward declaration of the local functions
local sanitizeDataset, loadData, link, formatMessage
`;

  const dstLuaText = `
--    {{#invoke : TNT | doc | Graph:Lines }}
--        uses https://commons.wikimedia.org/wiki/Data:Templatedata/Graph:Lines.tab
--        if the current page is Template:Graph:Lines/doc
--

local i18nDataset = 'I18n/Module:TNT.map'

-- Forward extra words declaration of the local functions
new line added
local sanitizeDataset, loadData, link, formatMessage
`;

  const srcWikiText = `
{{#invoke:TNT | doc | Graph:Lines }}
Some [https://commons.wikimedia.org/wiki/Data:Templatedata/Graph:Lines.tab link] to [[wiki|markup]].
`;

  const dstWikiText = `
{{#invoke:TNT | doc | Graph:Lines }}
Some text [https://commons.wikimedia.org/wiki/Data:Templatedata/Graph:Bars.tab link] to [[wiki|markup]]
is not.
`;



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
        let dstTitleUrl = `https://${dstSite}${domainSuffix}${titleUrlSuffix}${dst.title}`;
        yield {
          key: dstTitleUrl,
          type,
          srcSite: src.primarySite,
          srcFullTitle: src.primaryTitle,
          srcTitle,
          srcTitleUrl,
          dstSite,
          dstFullTitle: dst.title,
          dstTitle: splitNs(dst.title)[1],
          dstTitleUrl: dstTitleUrl,
          isInSync: dst.behind === 0,
          behind: dst.behind,
          diverged: !!dst.diverged,
          srcText: type === 'module' ? srcLuaText : srcWikiText,
          dstText: type === 'module' ? dstLuaText : dstWikiText,
        };
      }
    }
  }

  return Array.from(flatten(data));
};
