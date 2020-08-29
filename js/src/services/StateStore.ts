import {
  isSyncCopy,
  Item,
  Items,
  PageType,
  Project,
  RawData,
  RawSyncData,
  LoadResult,
  SrvAllData,
  SrvAllDataTyped,
  SrvDivergedContentType,
  SrvNewContentType,
  SrvNoSyncCopy,
  SrvOkContentType,
  SrvOutdatedContentType,
  SrvPageType,
  SrvSyncCopy,
  SrvSyncPage,
  SrvUnlocalizedContentType
} from './types';

import fauxData from './faux/all.json';
import fauxPageDivergedBcl from './faux/diverged-Q63324398-bcl.json';
import fauxPageNewAb from './faux/new-Q63324398-ab.json';
import fauxPageOkZh from './faux/ok-Q63324398-zh.json';
import fauxPageOutdatedDe from './faux/outdated2-Q63324398-de.json';

import { getToken, postToApi, rootUrlData, splitNs, wikiUrl } from './utils';
import { map } from 'lodash';
import { SiteData } from '../contexts/Settings';

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
  };
};

export class StateStore {
  isDebugging: boolean;
  isFakeData: boolean;
  rawData: RawData = new Map<string, SrvPageType>();
  rawSyncData: RawSyncData = new Map<string, SrvSyncPage>();
  items: Items;

  constructor(isDebugging: boolean) {
    this.isDebugging = isDebugging;
    this.isFakeData = false;
    this.items = [];
  }

  async loadData(qid?: string, domain?: string): Promise<LoadResult> {
    const applyResult = (data: SrvAllData): LoadResult => {
      // set of srvPages that are being updated from the server
      // this will also contain undefined, but we ignore that later
      const obsoletePages = new Set<SrvPageType | undefined>();
      const newPages: SrvSyncPage[] = [];
      for (const page of data.pages) {
        obsoletePages.add(this.rawData.get(page.primaryTitle));
        this.rawData.set(page.primaryTitle, page);
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

      // Ignore those that haven't been updated
      this.items = this.items.filter(v => !obsoletePages.has(v.srvPage));
      for (const page of newPages) {
        const [pageType, titleWithoutNs] = splitNs(page.primaryTitle);
        const srcTitleUrl = wikiUrl(page.primarySite, page.primaryTitle);
        for (let clone of page.copies) {
          this.items.push(createItem(pageType, titleWithoutNs, srcTitleUrl, page, clone));
        }
      }
      return { status: this.isFakeData ? 'debug' : 'success', content: data.content };
    };

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
      return applyResult(data);
    } catch (err) {
      if (!this.isDebugging) {
        return { status: 'error', exception: err };
      }
      this.isFakeData = true;

      //SrvOkContentType
      // | SrvOutdatedContentType | SrvUnlocalizedContentType | SrvDivergedContentType | SrvNewContentType,

      switch (domain) {
        case 'bcl.wikipedia.org':
          return applyResult(fauxPageDivergedBcl as SrvAllDataTyped<SrvDivergedContentType>);
        case 'ab.wikipedia.org':
          return applyResult(fauxPageNewAb as SrvAllDataTyped<SrvNewContentType>);
        case 'zh.wikipedia.org':
          return applyResult(fauxPageOkZh as SrvAllDataTyped<SrvOkContentType>);
        case 'de.wikipedia.org':
          return applyResult(fauxPageOutdatedDe as SrvAllDataTyped<SrvOutdatedContentType>);
        default:
          return applyResult(fauxData as SrvAllDataTyped<undefined>);
      }
    }
  }
}

export const editItem = async function (
  item: Item,
  content: SrvOutdatedContentType
    | SrvUnlocalizedContentType
    | SrvDivergedContentType
    | SrvNewContentType,
  comment: string
) {
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
  apiData.summary = comment;
  apiData.text = content.newText;
  apiData.token = await getToken(item.wiki);

  return await postToApi(item.wiki, apiData);
};

export const createSitelink = async function (siteData: SiteData, item: Item) {
  const linksite = siteData.sites.filter(v => v.url === `https://${item.wiki}`)[0];
  if (!linksite) throw new Error(item.wiki);

  const apiData: any = {
    action: 'wbsetsitelink',
    id: item.qid,
    linksite: linksite,
    linktitle: item.dstFullTitle,
    token: await getToken(item.wiki),
  };

  return await postToApi('wikidata.org', apiData);
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
