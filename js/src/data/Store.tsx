import { AddToast, Item, ItemTypeType } from './types';

// import fauxData from './fauxData.small.json';
import fauxData from './fauxData.json';
import { rootUrl } from '../utils';

const titleUrlSuffix = '/wiki/';

export async function getItems(addToast: AddToast): Promise<Array<Item>> {
  let cache: any;

  async function getData(addToast: AddToast) {
    if (cache) {
      return cache;
    }
    try {
      let itemData = await fetch(`${rootUrl}data`);
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

  function * flatten(data: Array<{
    id: string,
    primarySite: string,
    primaryTitle: string,
    primaryRevId: number,
    copies: any
  }>): Generator<Item> {
    const splitNs = (t: string): [ItemTypeType, string] => {
      const pos = t.indexOf(':');
      return [t.substring(0, pos).toLowerCase() as ItemTypeType, t.substring(pos + 1)];
    };
    for (let src of data) {
      const [type, title] = splitNs(src.primaryTitle);
      const srcTitleUrl = `https://${src.primarySite}${titleUrlSuffix}${src.primaryTitle}`;
      for (let dstSite of Object.keys(src.copies)) {
        const dstLangSiteParts = dstSite.split('.');
        let ind = dstLangSiteParts.length - 1;
        if (dstLangSiteParts[ind] === 'wikimedia') {
          ind--;  // Multiple sites, look at the subdomain
        }
        const project = dstLangSiteParts[ind--];
        const lang = (ind >= 0 && dstLangSiteParts[ind] !== 'www') ? dstLangSiteParts[ind] : '-';

        const dst = src.copies[dstSite];
        const dstTitleUrl = `https://${dstSite}${titleUrlSuffix}${dst.title}`;
        yield {
          key: dstTitleUrl,
          qid: src.id,
          type,
          srcSite: src.primarySite,
          srcRevId: src.primaryRevId,
          srcFullTitle: src.primaryTitle,
          title,
          srcTitleUrl,
          project,
          lang,
          dstSite: dstSite,
          matchedRevId: dst.matchedRevId,
          dstFullTitle: dst.title,
          dstTitle: splitNs(dst.title)[1],
          dstTitleUrl: dstTitleUrl,
          status: dst.status,
          behind: dst.behind > 0 ? dst.behind : undefined,
          not_multisite_deps: dst.not_multisite_deps,
          multisite_deps_not_on_dst: dst.multisite_deps_not_on_dst,
        };
      }
    }
  }

  return Array.from(flatten(data));
}

export const defaultSearchableFields: Array<string> = [
  'status', 'type', 'dstSite', 'behind', 'lang', 'title', 'dstTitle',
];

export async function fetchContent(site: string, title: string): Promise<string> {
  const params = new URLSearchParams({
    origin: '*',
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'revisions',
    rvprop: 'user|comment|timestamp|content|ids',
    rvslots: 'main',
    titles: title,
  });

  let result;
  try {
    result = await fetch(`https://${site}/w/api.php?${params.toString()}`);
    if (result.ok) {
      let data = await result.json();
      return data.query.pages[0].revisions[0].slots.main.content;
    }
  } catch (err) {
    throw new Error(`Error requesting ${title}\n${err}`);
  }
  throw new Error(`Unable to get ${title}\n${result.status}: ${result.statusText}\n${await result.text()}`);
}

// export function siteToDomain(site: string): string {
//   let result = site;
//   if (site === 'mediawiki') {
//     result = 'www.' + result;
//   }
//   return result + '.org';
// }
