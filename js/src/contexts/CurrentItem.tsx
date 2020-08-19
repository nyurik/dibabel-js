import React, { Dispatch, useCallback, useContext, useState } from 'react';
import { error, rootUrlData, sleep } from '../utils';
import { Item, Props, SyncContentType } from '../types';
import { AllDataContext, DataLoadStatus, updateSyncInfo } from './AllData';
import { isEqual } from 'lodash';
import { ItemDstLink } from '../components/Snippets';
import { ToastsContext } from './Toasts';
import { EuiText } from '@elastic/eui';

type ItemContent = Item | undefined;

interface ItemStatus {
  status: DataLoadStatus;
  error?: string;
}

type ItemContentType = {
  itemStatus: ItemStatus,
  setItemStatus: Dispatch<ItemStatus>,
  currentItem?: Item,
  syncData?: SyncContentType,
  setCurrentItem: Dispatch<ItemContent>,
  updateSavedItem: Dispatch<Item>,
};

const initialStatus = { status: 'reset' } as ItemStatus;

export const CurrentItemContext = React.createContext<ItemContentType>({} as ItemContentType);

type SyncLoader = {
  status: ItemStatus,
  newItem?: Item,
  newSyncData?: SyncContentType,
};

async function loadSyncData(item: Item): Promise<SyncLoader> {
  const result = {} as SyncLoader;
  try {
    const res = await fetch(`${rootUrlData}page/${item.qid}/${item.wiki}`);
    if (res.ok) {
      const data: SyncContentType = await res.json();
      const newItem = updateSyncInfo({ ...item }, data.syncInfo);
      if (!isEqual(item, newItem)) {
        result.newItem = newItem;
      }
      result.status = { status: 'ready' };
      result.newSyncData = data;
    } else {
      result.status = ({
        status: 'error',
        error: `Unable to get the page. ${res.status}: ${res.statusText}\n${await res.text()}`
      });
    }
  } catch (err) {
    result.status = ({ status: 'error', error: `Unable to get the page. ${err.toString()}` });
  }
  return result;
}

export const CurrentItemProvider = ({ children }: Props) => {
  const addToast = useContext(ToastsContext);
  const { updateItem } = useContext(AllDataContext);

  let [currentItem, setCurrentItem] = useState<ItemContent>(undefined);
  let [itemStatus, setItemStatus] = useState<ItemStatus>(initialStatus);
  let [syncData, setSyncData] = useState<SyncContentType | undefined>();

  const setCurrentItemCB = useCallback((item: ItemContent) => {
    (async () => {
      setCurrentItem(item);
      if (!item) {
        setItemStatus({ status: 'reset' });
      } else {
        setItemStatus({ status: 'loading' });
        const res = await loadSyncData(item);
        if (res.newItem) {
          updateItem(res.newItem);
          setCurrentItem(res.newItem);
        }
        if (res.status.status === 'ready') {
          setSyncData(res.newSyncData);
        }
        setItemStatus(res.status);
      }
    })();
  }, [updateItem]);

  const updateSavedItem = useCallback((item: Item) => {
    (async () => {
      let tries = 0;
      const maxTries = 30;
      for (; tries < maxTries; tries++) {
        const res = await loadSyncData(item);
        if (res.status.status !== 'ready') {
          break;
        }
        if (res.newSyncData!.syncInfo!.timestamp !== item.dstTimestamp) {
          updateItem(res.newItem!);
          break;
        }
        // Sleep, but no longer than 10 seconds each time
        await sleep(1000 * Math.min(10, tries));
      }
      if (tries === maxTries) {
        addToast(error({
          title: (<EuiText><ItemDstLink item={item}/>{' '}was updated, but the DiBabel server was not able to get
            updated information.</EuiText>),
        }));
      }
    })();
  }, [addToast, updateItem]);

  return (
    <CurrentItemContext.Provider
      value={{ itemStatus, setItemStatus, currentItem, syncData, setCurrentItem: setCurrentItemCB, updateSavedItem }}>
      {children}
    </CurrentItemContext.Provider>
  );
};

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
