import { map } from 'lodash';
import pLimit from 'p-limit';

import {
  isEqualSrvPage,
  isSyncCopy,
  Item,
  Items,
  LoadResult,
  PageType,
  Project,
  RawData,
  RawSyncData,
  SrvAllData,
  SrvAllDataTyped,
  SrvDivergedContentType,
  SrvNewContentType,
  SrvNoSyncCopy,
  SrvOkContentType,
  SrvOutdatedContentType,
  SrvPageType,
  SrvSyncCopy,
  SrvSyncPage
} from './types';

import fauxData from './faux/all.json';
import fauxPageDivergedBcl from './faux/diverged-Q63324398-bcl.json';
import fauxPageNewAb from './faux/new-Q63324398-ab.json';
import fauxPageOkZh from './faux/ok-Q63324398-zh.json';
import fauxPageOutdatedDe from './faux/outdated2-Q63324398-de.json';

import { getToken, postToApi, rootUrlData, sleep, splitNs, wikidataDomain, wikiUrl } from './utils';
import { SiteData } from '../contexts/Settings';

// Limit server requests to no more than this number simultaneously
const apiLimit = pLimit(5);

export const createItem = (
  pageType: PageType,
  titleWithoutNs: string,
  srcTitleUrl: string,
  page: SrvSyncPage,
  clone: SrvSyncCopy,
): Item => {
  const dstLangSiteParts = clone.domain.split('.');
  // Skip .org
  let ind = dstLangSiteParts.length - 2;
  if (dstLangSiteParts[ind] === 'wikimedia') {
    ind--;  // Multiple sites, look at the subdomain
  }
  const project = dstLangSiteParts[ind--] as Project;
  const lang = (ind >= 0 && dstLangSiteParts[ind] !== 'www') ? dstLangSiteParts[ind] : '-';
  const dstTitleUrl = wikiUrl(clone.domain, clone.title);
  let missingDeps = page.allPrimaryDependencies.size > 0;
  let staleDeps = false;
  let unsyncedDeps = false;
  page.allLocalDependencies.forEach((value) => {
    const dep = value.copiesLookup.get(clone.domain);
    if (!dep) {
      missingDeps = true;
    } else if (isSyncCopy(dep)) {
      if (dep.status !== 'ok') {
        staleDeps = true;
      }
    } else if (value.type === 'no_sync') {
      unsyncedDeps = true;
    }
  });

  return {
    srvPage: page,
    srvCopy: clone,
    key: dstTitleUrl,
    qid: page.qid,
    type: pageType,
    srcSite: page.primarySite,
    srcFullTitle: page.primaryTitle,
    srcRevId: page.primaryRevId,
    title: titleWithoutNs,
    srcTitleUrl: srcTitleUrl,
    project: project,
    lang: lang,
    wiki: clone.domain,
    dstFullTitle: clone.title,
    dstTitle: splitNs(clone.title)[1],
    dstTitleUrl: dstTitleUrl,
    dstTimestamp: clone.timestamp,
    hash: clone.hash,
    status: clone.status,
    behind: clone.behind && clone.behind > 0 ? clone.behind : undefined,
    matchedRevId: clone.matchedRevId,
    protection: clone.protection ? clone.protection.join(', ') : '',
    sortStatus: `${clone.status}/${clone.behind}/${clone.hash}`,
    missingDeps: missingDeps,
    unsyncedDeps: unsyncedDeps,
    staleDeps: staleDeps,
    sortDepsStatus: (missingDeps ? 4 : 0) + (unsyncedDeps ? 2 : 0) + (staleDeps ? 1 : 0),
    selectable: !missingDeps && !staleDeps && !unsyncedDeps && (clone.status === 'outdated' || clone.status === 'unlocalized'),
  };
};

export class StateStore {

  isDebugging: boolean;
  isFakeData: boolean;
  rawData: RawData = new Map<string, SrvPageType>();
  rawSyncData: RawSyncData = new Map<string, SrvSyncPage>();
  items: Items;
  itemMap = new Map<string, Map<string, Item>>();

  constructor(isDebugging: boolean) {
    this.isDebugging = isDebugging;
    this.isFakeData = false;
    this.items = [];
  }

  loadData(qid?: string, domain?: string): Promise<LoadResult> {
    return apiLimit(() => this._loadData(qid, domain));
  }

  editItem(item: Item, comment: string): Promise<any> {
    return apiLimit(() => this._editItem(item, comment));
  }

  async _editItem(item: Item, comment: string) {
    const content = item.content;
    if (!content || content.changeType === 'ok') {
      throw new Error('No content');
    }

    const apiData: any = {
      action: 'edit',
      title: item.dstFullTitle,
    };

    if (content.changeType === 'new') {
      apiData.createonly = '1';
    } else {
      apiData.basetimestamp = content.currentRevTs;
      apiData.nocreate = '1';
    }

    // put text at the end for easier log inspection
    apiData.summary = comment.trim();
    apiData.text = content.newText;
    apiData.token = await getToken(item.wiki);

    if (this.isFakeData) {
      await sleep(3000);
      return { edit: { result: 'Success', data: apiData } };
    }

    return await postToApi(item.wiki, apiData);
  };

  _applyResult(data: SrvAllData, qid?: string, domain?: string): LoadResult {
    // set of srvPages that are being updated from the server
    const updatedPages = new Set<SrvPageType | undefined>();
    const newPages: SrvSyncPage[] = [];

    for (const page of data.pages) {
      const existingPrimary = this.rawData.get(page.primaryTitle);
      if (existingPrimary) {
        if (isEqualSrvPage(existingPrimary, page)) {
          continue;
        }
        updatedPages.add(existingPrimary);
        Object.assign(existingPrimary, page);
      } else {
        this.rawData.set(page.primaryTitle, page);
      }
      if (page.type === 'sync') {
        this.rawSyncData.set(page.primaryTitle, page);
        newPages.push(page);
      }
      if (page.type === 'sync' || page.type === 'manual_sync' || page.type === 'no_sync') {
        page.copiesLookup = new Map(map(page.copies, (v: SrvSyncCopy | SrvNoSyncCopy) => [v.domain, v]));
      }
    }

    // Once all rawData is updated, compute all dependencies for each page
    for (const page of newPages) {
      page.allLocalDependencies = new Map();
      page.allPrimaryDependencies = new Map();
      const addDependencies = (pg: SrvSyncPage) => {
        for (const dep of pg.dependencies) {
          const p = this.rawData.get(dep)!;
          if (p.type === 'missing' || p.type === 'no_wd') {
            page.allPrimaryDependencies.set(dep, p);
          } else if (!page.allLocalDependencies.has(dep)) {
            page.allLocalDependencies.set(dep, p);
            if (p.type === 'sync') {
              addDependencies(p);
            }
          }
        }
      };
      // recursively add all dependencies as a Map<title, SrvSyncPage>
      addDependencies(page);
      // make sure we don't depend on itself
      page.allLocalDependencies.delete(page.primaryTitle);
    }

    for (const page of newPages) {
      const [pageType, titleWithoutNs] = splitNs(page.primaryTitle);
      const srcTitleUrl = wikiUrl(page.primarySite, page.primaryTitle);
      let map2 = this.itemMap.get(page.qid);
      if (map2 === undefined) {
        map2 = new Map<string, Item>();
        this.itemMap.set(page.qid, map2);
      }
      for (let clone of page.copies) {
        const oldItem = map2.get(clone.domain);
        const newItem = createItem(pageType, titleWithoutNs, srcTitleUrl, page, clone);
        if (oldItem === undefined) {
          this.items.push(newItem);
          map2.set(clone.domain, newItem);
        } else {
          Object.assign(oldItem, newItem);
        }
      }
    }

    if (qid && domain && data.content) {
      const item = this.itemMap.get(qid)!.get(domain)!;
      item.content = data.content;
      if (item.contentStatus === undefined) {
        item.contentStatus = { status: 'ready' };
      } else if (item.contentStatus.status !== 'saved') {
        item.contentStatus.status = 'ready';
      }
    }

    return { status: this.isFakeData ? 'debug' : 'success' };
  };

  async _loadData(qid?: string, domain?: string): Promise<LoadResult> {
    let data;
    try {
      if (this.isFakeData) {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error(); // Switched to debug mode, ignore regular fetch
      }

      let resp = await fetch(`${rootUrlData}${qid ? `page/${qid}/${domain}` : 'data'}`);
      if (!resp.ok) {
        return {
          status: 'error',
          exception: new Error(`${resp.status}: ${resp.statusText}\n` + await resp.text()),
        };
      }

      data = await resp.json();
      return this._applyResult(data, qid, domain);

    } catch (err) {

      if (!this.isDebugging) {
        return { status: 'error', exception: err };
      }

      this.isFakeData = true;
      switch (domain) {
        case 'bcl.wikipedia.org':
          return this._applyResult(fauxPageDivergedBcl as SrvAllDataTyped<SrvDivergedContentType>, qid, domain);
        case 'ab.wikipedia.org':
          return this._applyResult(fauxPageNewAb as SrvAllDataTyped<SrvNewContentType>, qid, domain);
        case 'zh.wikipedia.org':
          return this._applyResult(fauxPageOkZh as SrvAllDataTyped<SrvOkContentType>, qid, domain);
        case 'de.wikipedia.org':
          return this._applyResult(fauxPageOutdatedDe as SrvAllDataTyped<SrvOutdatedContentType>, qid, domain);
        default:
          return this._applyResult(fauxData as SrvAllDataTyped<undefined>, qid, domain);
      }
    }
  }
}

export const createSitelink = async function (siteData: SiteData, item: Item) {
  const linksite = siteData.sites.filter(v => v.url === `https://${item.wiki}`)[0];
  if (!linksite) throw new Error(item.wiki);

  const apiData: any = {
    action: 'wbsetsitelink',
    id: item.qid,
    linksite: linksite.dbname,
    linktitle: item.dstFullTitle,
    token: await getToken(wikidataDomain),
  };

  return await postToApi(wikidataDomain, apiData);
};
