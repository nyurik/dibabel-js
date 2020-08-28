import React, { Dispatch, useCallback, useContext, useState } from 'react';

import { error, sleep } from '../services/utils';
import { Item, OptionalContentTypes, Props, SrvContentTypes } from '../services/types';
import { AllDataContext, ItemStatus } from './AllData';
import { ItemDstLink } from '../components/Snippets';
import { ToastsContext } from './Toasts';
import { Message } from '../components/Message';

type OptionalItem = Item | undefined;

type ItemContentType = {
  itemStatus: ItemStatus,
  setItemStatus: Dispatch<ItemStatus>,
  currentItem?: Item,
  itemContent?: SrvContentTypes,
  setCurrentItem: Dispatch<OptionalItem>,
  updateSavedItem: Dispatch<Item>,
};

const initialStatus = { status: 'reset' } as ItemStatus;

export const CurrentItemContext = React.createContext<ItemContentType>({} as ItemContentType);

export const CurrentItemProvider = ({ children }: Props) => {
  const { addToast } = useContext(ToastsContext);
  const { loadItem } = useContext(AllDataContext);

  let [currentItem, setCurrentItem] = useState<OptionalItem>(undefined);
  let [itemStatus, setItemStatus] = useState<ItemStatus>(initialStatus);
  let [itemContent, setItemContent] = useState<OptionalContentTypes>();

  const setCurrentItemCB = useCallback((item: OptionalItem) => {
    (async () => {
      setCurrentItem(item);
      if (!item) {
        setItemStatus({ status: 'reset' });
      } else {
        setItemStatus({ status: 'loading' });
        const res = await loadItem(item.qid, item.wiki);
        if (res.newItem) {
          setCurrentItem(res.newItem);
        }
        if (res.status.status === 'ready') {
          setItemContent(res.content);
        }
        setItemStatus(res.status);
      }
    })();
  }, [loadItem]);

  const updateSavedItem = useCallback((item: Item) => {
    (async () => {
      let tries = 0;
      const maxTries = 30;
      for (; tries < maxTries; tries++) {
        const res = await loadItem(item.qid, item.wiki);
        if (res.status.status !== 'ready') {
          break;
        }
        const syncData = res.content!;
        if (syncData.changeType !== 'new' && syncData.currentRevTs !== item.dstTimestamp) {
          break;
        }
        // Sleep, but no longer than 10 seconds each time
        await sleep(1000 * Math.min(10, tries));
      }
      if (tries === maxTries) {
        addToast(error({
          title: (<Message id={'$1 was modified, but the DiBabel server was not able to get confirmation.'}
                           placeholders={[<ItemDstLink item={item}/>]}/>),
        }));
      }
    })();
  }, [addToast, loadItem]);

  return (
    <CurrentItemContext.Provider
      value={{
        itemStatus,
        setItemStatus,
        currentItem,
        itemContent,
        setCurrentItem: setCurrentItemCB,
        updateSavedItem
      }}>
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
