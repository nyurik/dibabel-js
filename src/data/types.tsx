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
    columns: Array<keyof Item>,
    extra_columns?: Array<keyof Item>,
    groupName: string,
    order: number,
  }
};

export type StatusType = 'diverged' | 'ok' | 'outdated';

export type ItemTypeType = 'module' | 'template';

export interface Item {
  key: string,
  type: ItemTypeType,
  srcSite: string,
  srcFullTitle: string,
  title: string,
  srcTitleUrl: string,
  project: string,
  lang: string,
  dstSite: string,
  dstFullTitle: string,
  dstTitle: string,
  dstTitleUrl: string,
  status: StatusType,
  ok: boolean,
  outdated: boolean,
  diverged: boolean,
  srcText: string,
  dstText: string,
  behind?: number,
}

export interface Group {
  key: string,
  allSubItems: Array<Item>,
  countOk: number,
  countOutdated: number,
  countDiverged: number,
  columns: Array<string>,
  items: Array<Item|Group>,
  type?: ItemTypeType,
  srcSite?: string,
  srcFullTitle?: string,
  title?: string,
  srcTitleUrl?: string,
  project?: string,
  lang?: string,
  dstSite?: string,
}
