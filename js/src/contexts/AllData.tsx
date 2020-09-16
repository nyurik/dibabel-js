import React, { Dispatch, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';

import { EuiText } from '@elastic/eui';

import { error, sleep, success } from '../services/utils';
import { ToastsContext } from './Toasts';
import { EditItem, Item, Items, LoadItem, Props, SyncLoaderOrItem } from '../services/types';
import { StateStore } from '../services/StateStore';
import { I18nContext } from './I18nContext';
import { Message } from '../components/Message';
import { ResetContext } from './ResetContext';
import { ItemDstLink } from '../components/Snippets';

export type DataLoadStatus = 'reset' | 'loading' | 'ready' | 'error' | 'saved';

type OptionalItem = Item | undefined;

export type AllDataContextType = {
  dataVersion: number,
  stateStore: StateStore,
  allItems: Items,
  status: DataLoadStatus,
  reload: Dispatch<void>,
  loadItem: LoadItem,
  editItem: EditItem,
  updateSavedItem: Dispatch<Item>,
  currentItem?: Item,
  setCurrentItem: Dispatch<OptionalItem>,
};

export const AllDataContext = React.createContext<AllDataContextType>({} as AllDataContextType);

const bumpDataVerDispatcher = (state: number) => state + 1;

export const AllDataProvider = ({ children }: Props) => {
  const { resetIndex } = useContext(ResetContext);
  const { i18n } = useContext(I18nContext);
  const { addToast } = useContext(ToastsContext);

  const [status, setStatus] = useState<DataLoadStatus>('reset');
  const [currentItem, setCurrentItem] = useState<OptionalItem>(undefined);

  const reload = useCallback(() => setStatus('reset'), []);
  const dataRef = useRef<StateStore>();
  const [dataVersion, bumpDataVersion] = useReducer(bumpDataVerDispatcher, 0);

  useEffect(() => {
    if (resetIndex) {
      reload();
    }
    // Should only trigger when resetIndex changes. The setters are immutable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetIndex]);

  if (dataRef.current === undefined) {
    dataRef.current = new StateStore(window.location.hostname === 'localhost');
  }
  const stateStore = dataRef.current!;

  useEffect(() => {
    if (status === 'reset') {
      setStatus('loading');
      (async () => {
        const res = await stateStore.loadData();
        bumpDataVersion();
        switch (res.status) {
          case 'error':
            setStatus('error');
            addToast(error({
              title: i18n('table-loading--error'),
              text: (<EuiText>{res.exception.toString()}</EuiText>),
            }));
            break;
          case 'success':
            setStatus('ready');
            addToast(success({
              title: i18n('dataloader-toast-success--title'),
              text: (
                <>
                  <Message id={'dataloader-toast-success--pages'} placeholders={[stateStore.rawSyncData.size]}/>
                  <br/>
                  <Message id={'dataloader-toast-success--copies'} placeholders={[stateStore.items.length]}/>
                </>),
            }));
            break;
          case 'debug':
            setStatus('ready');
            addToast(success({
              // DO NOT TRANSLATE
              title: 'DEBUG MODE!',
              text: 'USING DEBUG DATA',
            }));
            break;
          default:
            throw new Error(res.status);
        }
      })();
    }
  }, [addToast, i18n, stateStore, status]);

  const editItem: EditItem = useCallback(async (item, comment) => {
    try {
      const res = await dataRef.current!.editItem(item, comment);
      if (res.edit.result !== 'Success') {
        item.contentStatus = { status: 'error', error: res.edit.info || JSON.stringify(res.edit) };
      } else {
        item.contentStatus = { status: 'saved' };
      }
    } catch (err) {
      item.contentStatus = { status: 'error', error: err.toString() };
    }
    bumpDataVersion();
  }, []);

  const loadItem: LoadItem = useCallback(async (item: Item): Promise<SyncLoaderOrItem> => {

    // let item: SyncLoaderOrItem = stateStore.items.filter(v => v.qid === qid && v.wiki === wiki)[0];
    if (item.content !== undefined) {
      return item;
    }
    if (item.contentStatus && item.contentStatus.promise) {
      await item.contentStatus.promise;
      return item;
    }

    item.contentStatus = { status: 'loading' };
    bumpDataVersion();

    item.contentStatus.promise = dataRef.current!.loadData(item.qid, item.wiki);
    let res;
    try {
      res = await item.contentStatus.promise;
    } finally {
      item.contentStatus.promise = undefined;
    }

    bumpDataVersion();

    switch (res.status) {

      case 'error':
        addToast(error({
          title: i18n('dataloader-toast-error--title'),
          text: (<EuiText>{res.exception.toString()}</EuiText>),
        }));
        return { contentStatus: { status: 'error', error: res.exception.toString() } };

      case 'success':
      case 'debug':
        // TODO: detect actual changes and don't refresh when not needed
        setStatus('ready');
        if (res.status === 'debug') {
          addToast(success({
            // DO NOT TRANSLATE
            title: 'DEBUG MODE!',
            text: 'LOADED ITEM',
          }));
        }

        item.contentStatus = { status: 'ready' };
        return item;

      default:
        throw new Error(res.status);
    }
  }, [addToast, i18n]);

  const updateSavedItem = useCallback((item: Item) => {
    (async () => {
      let tries = 0;
      const maxTries = 30;
      for (; tries < maxTries; tries++) {
        const res = await loadItem(item);
        if (!res.contentStatus || res.contentStatus.status !== 'ready') {
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

  const setCurrentItemCB = useCallback((item: OptionalItem) => {
    (async () => {
      setCurrentItem(item);
      if (item) {
        await loadItem(item);
      }
    })();
  }, [loadItem]);

  return (
    <AllDataContext.Provider value={{
      stateStore,
      dataVersion,
      allItems: stateStore.items,
      status,
      reload,
      loadItem,
      editItem,
      updateSavedItem,
      currentItem,
      setCurrentItem: setCurrentItemCB,
    }}>
      {children}
    </AllDataContext.Provider>
  );
};
