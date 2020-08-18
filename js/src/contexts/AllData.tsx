import React, { Dispatch, useCallback, useContext, useEffect, useReducer, useState } from 'react';

import fauxData from './faux/fauxData.json';
import { error, rootUrl, splitNs, success } from '../utils';
import { EuiText } from '@elastic/eui';
import { ToastsContext } from './Toasts';
import { Item, ItemTypeType, Props, SourceDataType, SyncItemType, ToastNoId } from '../types';

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

export type DataLoadStatus = 'reset' | 'loading' | 'ready' | 'error'

export type AllDataContextType = {
  allItems: Item[],
  status: DataLoadStatus,
  reload: Dispatch<void>
  updateItem: Dispatch<Item>
}

const reducer = (allItems: Item[], newData: Item[] | Item) => {
  if (Array.isArray(newData)) {
    return newData;
  }
  // Replace updated item
  const newItems = [...allItems];
  for (let i = 0; i < newItems.length; i++) {
    if (newItems[i].key === newData.key) {
      newItems[i] = newData;
      break;
    }
  }
  return newItems;
};

const initialState: Item[] = [];

export const AllDataContext = React.createContext<AllDataContextType>({} as AllDataContextType);

export const AllDataProvider = ({ children }: Props) => {
  const addToast = useContext(ToastsContext);
  const [allItems, updateData] = useReducer(reducer, initialState);
  let [status, setStatus] = useState<DataLoadStatus>('reset');
  const reload = useCallback(() => setStatus('reset'), []);

  useEffect(() => {
    if (status === 'reset') {
      setStatus('loading');
      (async () => {
        const data = await downloadData(addToast);
        if (data === null) {
          updateData([]);
          setStatus('error');
        } else {
          updateData(data);
          setStatus('ready');
        }
      })();
    }
  }, [addToast, status]);

  return (
    <AllDataContext.Provider value={{ allItems, status, reload, updateItem: updateData }}>
      {children}
    </AllDataContext.Provider>
  );
};

async function downloadData(addToast: Dispatch<ToastNoId>): Promise<Array<Item> | null> {
  let data: SourceDataType[] = fauxData as any as SourceDataType[];
  try {
    let itemData = await fetch(`${rootUrl}data`);
    if (itemData.ok) {
      data = await itemData.json();
      const total = Object.values(data).reduce((a: number, v: any) => a + Object.keys(v.copies).length, 0);
      addToast(success({
        title: `Loaded data`,
        text: (<EuiText>
          {Object.keys(data).length} pages<br/>
          {total} copies
        </EuiText>),
      }));
    } else {
      addToast(error({ title: `${itemData.status}: ${itemData.statusText}`, text: await itemData.text() }));
    }
  } catch (err) {
    addToast(error({
      title: `Unable to parse data response, showing fake data`,
      text: `${err}`,
      toastLifeTimeMs: 15000,
    }));
  }

  function * flatten(data: SourceDataType[]): Generator<Item> {
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
