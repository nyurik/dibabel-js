import { Item } from './Store';
import { ReactChild } from 'react';
import { EuiToastProps } from '@elastic/eui/src/components/toast/toast';

/**
 * This overrides EUI's own toast interface to remove the ID requirement (auto-added later)
 * FIXME: Can this be done with importing Toast from @elastic/eui/src/components/toast/global_toast_list and using Exclude<> ?
 */
export interface Toast extends EuiToastProps {
  // id: string;
  text?: ReactChild;
  toastLifeTimeMs?: number;
}

export type SetType = (item: Item | null) => void;

export type LangInfo = { name: string, autonym: string } ;
export type LangInfoDict = { [key: string]: LangInfo };
export type AddToast = (toast: Toast) => void;

export type Props = { children: React.ReactNode };

export type GroupDefsType = {
  [key: string]: {
    columns: Array<string>,
    extra_columns?: Array<string>,
    groupName: string,
    order: number,
  }
};
