import { ReactChild } from 'react';
import { EuiToastProps } from '@elastic/eui/src/components/toast/toast';
import { DataLoadStatus } from '../contexts/AllData';
import { clone, isEqual } from 'lodash';

export type StatusType = 'ok' | 'outdated' | 'unlocalized' | 'diverged' | 'new';

export type DependencyStatus = 'missing' | 'sync' | 'manual_sync' | 'no_sync' | 'no_wd'

export type PageType = 'module' | 'template';

export type Props = { children: React.ReactNode };

export type GroupDefsType = {
  [key: string]: {
    columns: Array<keyof Item>,
    extra_columns?: Array<keyof Item>,
    groupI18n: string,
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
  srvPage: SrvSyncPage,
  srvCopy: SrvSyncCopy,
  key: string,
  qid: string,
  type: PageType,
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
  dstTimestamp?: string,
  hash?: string,
  status: StatusType,
  behind?: number,
  matchedRevId?: number,
  protection?: string,
  sortStatus: string,
  missingDeps: boolean,
  staleDeps: boolean,
  unsyncedDeps: boolean,
  sortDepsStatus: number,
  selectable: boolean,
  contentStatus?: ItemStatus,
  content?: SrvContentTypes,
}

export type Group = {
  key: string,
  allSubItems: Item[],
  countOk: number,
  countUnlocalized: number,
  countOutdated: number,
  countDiverged: number,
  columns: string[],
  items: Array<Item | Group>,
  type?: PageType,
  srcSite?: string,
  srcFullTitle?: string,
  title?: string,
  srcTitleUrl?: string,
  project?: string,
  lang?: string,
  wiki?: string,
}

export function isGroup(value: Item | Group): value is Group {
  return (value as Group).allSubItems !== undefined;
}

export function isSyncCopy(value: SrvNoSyncCopy | SrvSyncCopy): value is SrvSyncCopy {
  return (value as SrvSyncCopy).status !== undefined;
}

export type TitlesMap<T> = Map<string, T>;

export type DependencyInfo = TitlesMap<DependencyStatus>;

export type SrvAllDataTyped<T> = {
  pages: SrvPageType[],
  content: T,
}

export type SrvContentTypes =
  SrvOkContentType
  | SrvOutdatedContentType
  | SrvUnlocalizedContentType
  | SrvDivergedContentType
  | SrvNewContentType;

export type OptionalContentTypes = undefined | SrvContentTypes;

export type SrvAllData = SrvAllDataTyped<OptionalContentTypes>;

/**
 * sync        - page is enabled for multi-site synchronization
 * missing     - page does not exist at mediawiki.org
 * manual_sync - page is specially tagged as synced by hand (e.g. Template:Documentation)
 * no_sync     - page is in Wikidata, but not marked for any type of syncing
 * no_wd       - page exists but does not have a wikidata entry
 */
export type SrvPageType = SrvSyncPage | SrvMissingPage | SrvManualSyncPage | SrvNoSyncPage | SrvNoWikidataPage;

export type SrvPageWithCopies<T> = {
  copies: T[],
  // Copies as a lookup by domain. Generated locally.
  copiesLookup: Map<string, T>,
};

export type SrvSyncPage = {
  type: 'sync',
  primarySite: string,
  primaryTitle: string,
  qid: string,
  primaryRevId: number,
  dependencies: string[],

  // Generated locally. Make sure the localSrvSyncPageProps below has these values.
  // Dependencies that exist on local wikis (have a WD entry)
  allLocalDependencies: TitlesMap<SrvSyncPage | SrvManualSyncPage | SrvNoSyncPage>,
  // Dependencies without the local pages (have no WD entry, or missing)
  allPrimaryDependencies: TitlesMap<SrvMissingPage | SrvNoWikidataPage>,
} & SrvPageWithCopies<SrvSyncCopy>;

// This must match the extra values added locally in SrvSyncPage
export const localSrvSyncPageProps = new Set(['allLocalDependencies', 'allPrimaryDependencies', 'copiesLookup']);

export function isEqualSrvPage(localObj: SrvPageType, newObj: SrvPageType): boolean {
  const old2: any = clone(localObj);
  localSrvSyncPageProps.forEach(v => { delete old2[v]; });
  return isEqual(old2, newObj);
}

export type SrvMissingPage = {
  type: 'missing',
  primarySite: string,
  primaryTitle: string,
}

export type SrvManualSyncPage = {
  type: 'manual_sync',
  primarySite: string,
  primaryTitle: string,
  qid: string,
  primaryRevId: number,
} & SrvPageWithCopies<SrvNoSyncCopy>;

export type SrvNoSyncPage = {
  type: 'no_sync',
  primarySite: string,
  primaryTitle: string,
  qid: string,
} & SrvPageWithCopies<SrvNoSyncCopy>;

export type SrvNoWikidataPage = {
  type: 'no_wd',
  primarySite: string,
  primaryTitle: string,
}

export type SrvChangeContentChangesType = {
  user: string,
  ts: string,
  comment: string,
  revid: number,
};

type SrvContentPrimary = {
  domain: string,
  qid: string,
  title: string,
}

type SrvContentCurrent = {
  currentText: string,
  currentRevId: number,
  currentRevTs: string,
}

type SrvContentNew = {
  newText: string,
}

export type SrvOkContentType = {
  changeType: 'ok',
} & SrvContentPrimary & SrvContentCurrent;

export type SrvOutdatedContentType = {
  changeType: 'outdated',
  changes: SrvChangeContentChangesType[],
} & SrvContentPrimary & SrvContentCurrent & SrvContentNew;

export type SrvUnlocalizedContentType = {
  changeType: 'unlocalized',
} & SrvContentPrimary & SrvContentCurrent & SrvContentNew;

export type SrvDivergedContentType = {
  changeType: 'diverged',
} & SrvContentPrimary & SrvContentCurrent & SrvContentNew;

export type SrvNewContentType = {
  changeType: 'new',
} & SrvContentPrimary & SrvContentNew;

export type EditItem = (
  item: Item,
  comment: string
) => Promise<any>;

export type LoadItem = (item: Item) => Promise<SyncLoaderOrItem>;

export type SrvSyncCopy = {
  domain: string,
  title: string,
  status: StatusType,
  hash?: string,
  timestamp?: string,
  behind?: number,
  matchedRevId?: number,
  protection?: string[],
}

export type SrvNoSyncCopy = {
  domain: string,
  title: string,
}

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
    protection: { type: 'string' },
    missingDeps: { type: 'boolean' },
    staleDeps: { type: 'boolean' },
    unsyncedDeps: { type: 'boolean' },
  },
};

export const defaultSearchableFields = ['status', 'wiki', 'lang', 'title', 'dstTitle'];

export const groupDefs: GroupDefsType = {
  'lang': {
    order: 1,
    columns: ['lang'],
    groupI18n: 'filters-groupby--lang',
  },
  'project': {
    order: 1,
    columns: ['project'],
    groupI18n: 'filters-groupby--project',
  },
  'wiki': {
    order: 2,
    columns: ['wiki'],
    extra_columns: ['lang', 'project'],
    groupI18n: 'filters-groupby--site',
  },
  'srcTitleUrl': {
    order: 3,
    columns: ['title'],
    extra_columns: ['type', 'srcSite', 'srcFullTitle', 'srcTitleUrl'],
    groupI18n: 'filters-groupby--title',
  },
  'hash': {
    order: 4,
    columns: ['hash'],
    groupI18n: 'filters-groupby--hash',
  },
  'sortDepsStatus': {
    order: 3,
    columns: ['sortDepsStatus'],
    extra_columns: ['missingDeps', 'unsyncedDeps', 'staleDeps'],
    groupI18n: 'filters-groupby--deps-status',
  },
};

export type Items = Item[];

export type LoadResult = {
  status: 'success' | 'debug' | 'error',
  exception?: any,
};

export type RawData = TitlesMap<SrvPageType>;
export type RawSyncData = TitlesMap<SrvSyncPage>;

export type AddNewClone = {
  status: 'create',
  titleNoNs: string,
  wiki: string,
}

export interface ItemStatus {
  promise?: Promise<LoadResult>;
  status: DataLoadStatus;
  error?: string;
}

export type SyncLoader = {
  contentStatus: ItemStatus,
  // newItem?: Item,
  content?: SrvContentTypes,
};

export type SyncLoaderOrItem = SyncLoader | Item;

export function isItem(value: SyncLoader | Item): value is Item {
  return (value as Item).srvPage !== undefined;
}
