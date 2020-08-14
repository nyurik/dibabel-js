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

export type LangInfo = { name: string, autonym: string } ;
export type LangInfoDict = { [key: string]: LangInfo };
// export type AddToast = Dispatch<Toast>;

export type Props = { children: React.ReactNode };

export type GroupDefsType = {
  [key: string]: {
    columns: Array<keyof Item>,
    extra_columns?: Array<keyof Item>,
    groupName: string,
    order: number,
  }
};

export type StatusType = 'diverged' | 'ok' | 'outdated' | 'unlocalized';

export type ItemTypeType = 'module' | 'template';

export type Item = {
  key: string,
  qid: string,
  type: ItemTypeType,
  srcSite: string,
  srcFullTitle: string,
  srcRevId: number,
  title: string,
  srcTitleUrl: string,
  project: string,
  lang: string,
  dstSite: string,
  dstFullTitle: string,
  dstTitle: string,
  dstTitleUrl: string,
  dstTimestamp: string,
  dstContentHash?: string,
  status: StatusType,
  behind?: number,
  matchedRevId?: number,
  notMultisiteDeps?: Array<string>,
  multisiteDepsNotOnDst?: Array<string>,
  protection?: string,
  protectionArray?: Array<string>,
  sortStatus: string,
}

export type Group = {
  key: string,
  allSubItems: Array<Item>,
  countOk: number,
  countUnlocalized: number,
  countOutdated: number,
  countDiverged: number,
  columns: Array<string>,
  items: Array<Item | Group>,
  type?: ItemTypeType,
  srcSite?: string,
  srcFullTitle?: string,
  title?: string,
  srcTitleUrl?: string,
  project?: string,
  lang?: string,
  dstSite?: string,
}

export type SyncItemType = {
  title: string,
  timestamp: string,
  status: StatusType,
  diverged?: string,
  behind?: number,
  matchedRevId?: number,
  notMultisiteDeps?: Array<string>,
  multisiteDepsNotOnDst?: Array<string>,
  protection?: Array<string>,
}

export type SyncContentType = {
  currentText: string,
  currentRevId: number,
  newText: string,
  summary: string,
  syncInfo: SyncItemType,
};

export type UpdateItems = (key: string, info: SyncItemType) => void;
