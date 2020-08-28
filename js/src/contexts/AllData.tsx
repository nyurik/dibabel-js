import React, { Dispatch, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { EuiText } from '@elastic/eui';

import { error, success } from '../services/utils';
import { ToastsContext } from './Toasts';
import { Item, Items, Props, SrvContentTypes } from '../services/types';
import { StateStore } from '../services/StateStore';
import { I18nContext } from './I18nContext';
import { Message } from '../components/Message';

export type DataLoadStatus = 'reset' | 'loading' | 'ready' | 'error'

export type AllDataContextType = {
  stateStore: StateStore,
  allItems: Items,
  status: DataLoadStatus,
  reload: Dispatch<void>,
  loadItem: (qid: string, wiki: string) => Promise<SyncLoader>,
}

export const AllDataContext = React.createContext<AllDataContextType>({} as AllDataContextType);

export const AllDataProvider = ({ children }: Props) => {
  const { i18n } = useContext(I18nContext);
  const { addToast } = useContext(ToastsContext);
  let [status, setStatus] = useState<DataLoadStatus>('reset');
  const reload = useCallback(() => setStatus('reset'), []);
  const dataRef = useRef<StateStore>();

  if (dataRef.current === undefined) {
    dataRef.current = new StateStore(window.location.hostname === 'localhost');
  }
  const stateStore = dataRef.current!;

  useEffect(() => {
    if (status === 'reset') {
      setStatus('loading');
      (async () => {
        const res = await stateStore.loadData();
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

  const loadItem = useCallback(async (qid: string, wiki: string): Promise<SyncLoader> => {
    const res = await dataRef.current!.loadData(qid, wiki);
    switch (res.status) {
      case 'error':
        addToast(error({
          title: i18n('dataloader-toast-error--title'),
          text: (<EuiText>{res.exception.toString()}</EuiText>),
        }));
        return { status: { status: 'error', error: res.exception.toString() } };
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
        return {
          status: { status: 'ready' },
          newItem: stateStore.items.filter(v => v.qid === qid && v.wiki === wiki)[0],
          content: res.content,
        };
      default:
        throw new Error(res.status);
    }
  }, [addToast, i18n, stateStore]);

  return (
    <AllDataContext.Provider value={{ stateStore, allItems: stateStore.items, status, reload, loadItem }}>
      {children}
    </AllDataContext.Provider>
  );
};

export interface ItemStatus {
  status: DataLoadStatus;
  error?: string;
}

export type SyncLoader = {
  status: ItemStatus,
  newItem?: Item,
  content?: SrvContentTypes,
};
