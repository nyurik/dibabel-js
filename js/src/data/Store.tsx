import { Item, ItemTypeType, SourceDataType, SyncItemType } from './types';
import React, { Dispatch } from 'react';

// import fauxData from './faux/fauxData.small.json';
import fauxData from './faux/fauxData.json';
import { rootUrl, splitNs } from '../utils';
import { EuiText } from '@elastic/eui';
import { ToastNoId } from '../components/Toasts';

const titleUrlSuffix = '/wiki/';

export const createItem = (
  qid: string,
  srcSite: string,
  srcRevId: number,
  srcFullTitle: string,
  type: ItemTypeType,
  title: string,
  srcTitleUrl: string,
  wiki: string,
  dst: SyncItemType,
): Item => {
  const dstLangSiteParts = wiki.split('.');
  // Skip .org
  let ind = dstLangSiteParts.length - 2;
  if (dstLangSiteParts[ind] === 'wikimedia') {
    ind--;  // Multiple sites, look at the subdomain
  }
  const project = dstLangSiteParts[ind--];
  const lang = (ind >= 0 && dstLangSiteParts[ind] !== 'www') ? dstLangSiteParts[ind] : '-';

  const dstTitleUrl = `https://${wiki}${titleUrlSuffix}${dst.title}`;
  return updateSyncInfo({
    key: dstTitleUrl,
    qid, type, srcSite, srcRevId, srcFullTitle, title, srcTitleUrl, project, lang,
    wiki: wiki,
    dstFullTitle: dst.title,
    dstTitle: splitNs(dst.title)[1],
    dstTitleUrl: dstTitleUrl,
  } as Item, dst);
};

export const updateSyncInfo = (item: Item, dst: SyncItemType): Item => {
  item.matchedRevId = dst.matchedRevId;
  item.dstTimestamp = dst.timestamp;
  item.status = dst.status;
  item.behind = dst.behind && dst.behind > 0 ? dst.behind : undefined;
  item.notMultisiteDeps = dst.notMultisiteDeps;
  item.multisiteDepsNotOnDst = dst.multisiteDepsNotOnDst;
  item.protection = dst.protection ? dst.protection.join(', ') : '';
  item.protectionArray = dst.protection;
  item.hash = dst.hash;
  item.sortStatus = `${dst.status}/${dst.behind}/${dst.hash}`;

  return item;
};

export async function getItems(addToast: Dispatch<ToastNoId>): Promise<Array<Item>> {
  let cache: any;

  async function getData(addToast: Dispatch<ToastNoId>) {
    if (cache) {
      return cache;
    }
    try {
      let itemData = await fetch(`${rootUrl}data`);
      if (itemData.ok) {
        cache = await itemData.json();
        const total = Object.values(cache).reduce((a: number, v: any) => a + Object.keys(v.copies).length, 0);
        addToast({
          title: `Loaded data`,
          color: 'success',
          text: (<EuiText>
            {Object.keys(cache).length} pages<br/>
            {total} copies
          </EuiText>),
        });
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

  function * flatten(data: Array<SourceDataType>): Generator<Item> {
    for (let src of data) {
      const [type, title] = splitNs(src.primaryTitle);
      const srcTitleUrl = `https://${src.primarySite}${titleUrlSuffix}${src.primaryTitle}`;
      for (let wiki of Object.keys(src.copies)) {
        yield createItem(
          src.id,
          src.primarySite,
          src.primaryRevId,
          src.primaryTitle,
          type, title, srcTitleUrl,
          wiki,
          src.copies[wiki],
        );
      }
    }
  }

  return Array.from(flatten(data));
}

export const defaultSearchableFields: Array<string> = [
  'status', 'wiki', 'lang', 'title', 'dstTitle',
];

// export async function fetchContent(site: string, title: string): Promise<string> {
//   const params = new URLSearchParams({
//     origin: '*',
//     action: 'query',
//     format: 'json',
//     formatversion: '2',
//     prop: 'revisions',
//     rvprop: 'user|comment|timestamp|content|ids',
//     rvslots: 'main',
//     titles: title,
//   });
//
//   let result;
//   try {
//     result = await fetch(`https://${site}/w/api.php?${params.toString()}`);
//     if (result.ok) {
//       let data = await result.json();
//       return data.query.pages[0].revisions[0].slots.main.content;
//     }
//   } catch (err) {
//     throw new Error(`Error requesting ${title}\n${err}`);
//   }
//   throw new Error(`Unable to get ${title}\n${result.status}: ${result.statusText}\n${await result.text()}`);
// }

// export function siteToDomain(site: string): string {
//   let result = site;
//   if (site === 'mediawiki') {
//     result = 'www.' + result;
//   }
//   return result + '.org';
// }
