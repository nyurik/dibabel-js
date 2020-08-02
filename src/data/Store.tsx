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

import { AddToast } from './types';

// import fauxData from './fauxData.small.json';
import fauxData from './fauxData.json';

const domainSuffix = '.org';
const titleUrlSuffix = '/wiki/';

export async function getItems(addToast: AddToast) {

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

  let cache: any;

  async function getData(addToast: AddToast) {
    if (cache) {
      return cache;
    }
    try {
      let itemData = await fetch('/data');
      if (itemData.ok) {
        cache = await itemData.json();
        return cache;
      } else {
        addToast({
          title: `${itemData.status}: ${itemData.statusText}`,
          color: 'danger',
          iconType: 'alert',
          text: await itemData.text(),
        });
      }
    } catch (err) {
      addToast({
        title: `Unable to parse data response, showing fake data`,
        color: 'danger',
        iconType: 'alert',
        text: `${err}`,
        toastLifeTimeMs: 15000,
      });
    }
    cache = fauxData;
    return cache;
  }

  const data = await getData(addToast);

  function * flatten(data: Array<{ primarySite: string, primaryTitle: string, copies: any }>) {
    const splitNs = (t: string) => {
      const pos = t.indexOf(':');
      return [t.substring(0, pos).toLowerCase(), t.substring(pos + 1)];
    };
    for (let src of data) {
      const [type, title] = splitNs(src.primaryTitle);
      const srcTitleUrl = `https://${src.primarySite}${domainSuffix}${titleUrlSuffix}${src.primaryTitle}`;
      for (let dstSite of Object.keys(src.copies)) {
        const dstLangSiteParts = dstSite.split('.');
        const isWikimedia = dstLangSiteParts[1] === 'wikimedia';
        const dst = src.copies[dstSite];
        let dstTitleUrl = `https://${dstSite}${domainSuffix}${titleUrlSuffix}${dst.title}`;
        yield {
          key: dstTitleUrl,
          type,
          srcSite: src.primarySite,
          srcFullTitle: src.primaryTitle,
          title,
          srcTitleUrl,
          project: isWikimedia ? dstLangSiteParts[0] : dstLangSiteParts[1],
          lang: isWikimedia ? '-' : dstLangSiteParts[0],
          dstSite,
          dstFullTitle: dst.title,
          dstTitle: splitNs(dst.title)[1],
          dstTitleUrl: dstTitleUrl,
          status: dst.diverged ? 'diverged' : (dst.behind === 0 ? 'ok' : 'outdated'),
          ok: dst.behind === 0 && !dst.diverged,
          outdated: dst.behind > 0,
          diverged: !!dst.diverged,
          srcText: type === 'module' ? srcLuaText : srcWikiText,
          dstText: type === 'module' ? dstLuaText : dstWikiText,
          behind: dst.behind > 0 ? dst.behind : undefined,
        };
      }
    }
  }

  return Array.from(flatten(data));
}

export interface Item {
  [prop: string]: any
}

export const defaultSearchableFields: Array<string> = [
  'status', 'type', 'dstSite', 'behind', 'lang', 'title', 'dstTitle',
];

