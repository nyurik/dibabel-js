import {ReactChild, useContext} from 'react';
import { EuiToastProps } from '@elastic/eui/src/components/toast/toast';

import { I18nContext } from './contexts/I18nContext';
const { i18n } = useContext(I18nContext);

export type StatusType = 'ok' | 'outdated' | 'unlocalized' | 'diverged';

export type ItemTypeType = 'module' | 'template';

export type LangInfo = { name: string, autonym: string } ;

export type LangInfoDict = { [key: string]: LangInfo };

export type Props = { children: React.ReactNode };

export type GroupDefsType = {
  [key: string]: {
    columns: Array<keyof Item>,
    extra_columns?: Array<keyof Item>,
    groupName: string,
    order: number,
  }
};

export type Project =
  'commons'
  | 'incubator'
  | 'mediawiki'
  | 'meta'
  | 'species'
  | 'wikibooks'
  | 'wikidata'
  | 'wikimania'
  | 'wikinews'
  | 'wikipedia'
  | 'wikiquote'
  | 'wikisource'
  | 'wikiversity'
  | 'wikivoyage'
  | 'wiktionary';

export type Item = {
  key: string,
  qid: string,
  type: ItemTypeType,
  srcSite: string,
  srcFullTitle: string,
  srcRevId: number,
  title: string,
  srcTitleUrl: string,
  project: Project,
  lang: string,
  wiki: string,
  dstFullTitle: string,
  dstTitle: string,
  dstTitleUrl: string,
  dstTimestamp: string,
  hash?: string,
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
  wiki?: string,
}

export type SyncItemType = {
  title: string,
  status: StatusType,
  hash: string,
  timestamp: string,
  behind?: number,
  matchedRevId?: number,
  notMultisiteDeps?: Array<string>,
  multisiteDepsNotOnDst?: Array<string>,
  protection?: Array<string>,
}

// Endpoint /get_page gets this
export type SyncContentType = {
  currentText: string,
  currentRevId: number,
  newText: string,
  summary: string,
  syncInfo: SyncItemType,
};

// Endpoint /data returns an array of these values is downloaded from backend
export type SourceDataType = {
  id: string,
  primarySite: string,
  primaryTitle: string,
  primaryRevId: number,
  copies: { [p: string]: SyncItemType }
};

/**
 * This overrides EUI's own toast interface to remove the ID requirement (auto-added later)
 * FIXME: Can this be done with importing Toast from @elastic/eui/src/components/toast/global_toast_list and using Exclude<> ?
 * Exclude<EuiToast, 'id'> ?
 */
export interface ToastNoId extends EuiToastProps {
  // id: string;
  text?: ReactChild;
  toastLifeTimeMs?: number;
}

export type UpdateItems = (key: string, info: SyncItemType) => void;

export const schema = {
  strict: true,
  fields: {
    status: { type: 'string' },
    type: { type: 'string' },
    ok: { type: 'boolean' },
    behind: { type: 'number' },
    diverged: { type: 'boolean' },
    lang: { type: 'string' },
    project: { type: 'string' },
    title: { type: 'string' },
    hash: { type: 'string' },
    srcSite: { type: 'string' },
    srcFullTitle: { type: 'string' },
    srcTitleUrl: { type: 'string' },
    wiki: { type: 'string' },
    dstFullTitle: { type: 'string' },
    dstTitle: { type: 'string' },
    dstTitleUrl: { type: 'string' },
    protection: { type: 'string' }
  },
};

export const defaultSearchableFields = ['status', 'wiki', 'lang', 'title', 'dstTitle'];

export const groupDefs: GroupDefsType = {
  'lang': {
    order: 1,
    columns: ['lang'],
    groupName: i18n('dibabel-filters-groupby--lang'),
  },
  'project': {
    order: 1,
    columns: ['project'],
    groupName: i18n('dibabel-filters-groupby--project'),
  },
  'wiki': {
    order: 2,
    columns: ['wiki'],
    extra_columns: ['lang', 'project'],
    groupName: i18n('dibabel-filters-groupby--wiki'),
  },
  'srcTitleUrl': {
    order: 3,
    columns: ['title'],
    extra_columns: ['type', 'srcSite', 'srcFullTitle', 'srcTitleUrl'],
    groupName: i18n('dibabel-filters-groupby--title'),
  },
  'hash': {
    order: 4,
    columns: ['hash'],
    groupName: i18n('dibabel-filters-groupby--hash'),
  },
};
