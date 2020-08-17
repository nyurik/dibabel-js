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
  timestamp: string,
  hash: string,
  status: StatusType,
  // diverged?: string,
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

export type UpdateItems = (key: string, info: SyncItemType) => void;
