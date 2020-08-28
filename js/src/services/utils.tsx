import { DependencyList, Dispatch, useEffect, useState } from 'react';
import { Item, PageType, ToastNoId } from './types';

// lang=(zh or ace or de) shared template project:(wikipedia)

// Using full root for the ease of debugging locally. Eventually should probably use '/'
export const rootUrlData = '/';
// export const rootUrlData = 'http://localhost:5000/';
// export const rootUrlData = 'https://dibabel.toolforge.org/';
export const rootUrlSite = '/';

export const titleUrlSuffix = '/wiki/';

// export const rootUrlData = '/';

export function wikiUrl(site: string, title: string) {
  return `https://${site}${titleUrlSuffix}${encodeURIComponent(title)}`;
}

/**
 * React hook to store state in the local storage
 * @param key local store ID
 * @param initValue in case localStorage is empty
 * @param deserializer function to parse the value from the localStorage
 * @param serializer function to prepare value for the localStorage
 * @param deps optional list of dependencies
 */
export function usePersistedState<T>(
  key: string,
  initValue: string,
  deserializer: (value: string) => T,
  serializer: (value: T) => string,
  deps?: DependencyList
): [T, Dispatch<T>] {

  const [value, setValue] = useState(
    () => {
      const val = localStorage.getItem(key);
      if (val !== null) {
        try {
          return deserializer(val);
        } catch (err) {
          console.error(`Unable to parse value from local store: ${key}="${val}"`);
        }
      }
      // Use default in case of an error or if there is nothing stored
      return deserializer(initValue);
    });

  useEffect(
    () => {
      try {
        localStorage.setItem(key, serializer(value));
      } catch {
        // ignore any errors when storing, i.e. ignore Safari privacy mode issues
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps ? [value, ...deps] : [value]);

  return [value, setValue];
}

export function usePersistedJsonState<TValue>(
  key: string,
  initValue: TValue,
  deps?: DependencyList,
): [TValue, Dispatch<TValue>] {
  return usePersistedState(
    key,
    '',
    (val) => {
      let result;
      if (val === '') {
        result = initValue;
      } else {
        try {
          result = JSON.parse(val);
        } catch {
          result = initValue;
        }
      }
      return result;
    },
    (val) => JSON.stringify(val),
    deps
  );
}

export async function postToApi(domain: string, data: { [key: string]: string }) {
  const response = await fetch(`${rootUrlData}api/${domain}`, {
    method: 'POST',
    mode: 'cors', // TODO: possibly use a different mode here?  no-cors, cors, same-origin
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

const tokenCache: { [key: string]: string } = {};

export async function getToken(domain: string) {
  let token = tokenCache[domain];
  if (!token) {
    let res = await postToApi(domain, {
      action: 'query',
      meta: 'tokens',
      type: 'csrf',
    });
    token = res.query.tokens.csrftoken;
    tokenCache[domain] = token;
  }
  return token;
}

export const splitNs = (title: string): [PageType, string] => {
  const pos = title.indexOf(':');
  return [title.substring(0, pos).toLowerCase() as PageType, title.substring(pos + 1)];
};

export const sleep = (durationsMs: number) => {
  return new Promise(r => setTimeout(r, durationsMs));
};

export const itemDiffLink = ({ dstTitle, srcRevId, matchedRevId }: Item) => {
  return `https://www.mediawiki.org/w/index.php?title=${encodeURIComponent(dstTitle)}&type=revision&diff=${srcRevId}&oldid=${matchedRevId}`;
};

export const success = (toast: ToastNoId): ToastNoId => ({
  color: 'success', ...toast
});

export const warning = (toast: ToastNoId): ToastNoId => ({
  color: 'warning', ...toast
});

export const error = (toast: ToastNoId): ToastNoId => ({
  color: 'danger', iconType: 'alert', ...toast
});

export const prettyDomain = (lang: string, project: string) => {
  return lang !== '-' ? `${lang}.${project}` : project;
};

export function dbg(log: string, fn: any): any {
  return function () {
    console.log(`++++++ ${log}`, arguments);
    // debugger;
    return fn.apply(arguments);
  };
}

export function getSummaryMsgFromStatus(changeType: string): string {
  switch (changeType) {
    default:
      throw new Error(changeType);
    case 'outdated':
      return 'diff-summary-text--edit';
    case 'unlocalized':
      return 'diff-summary-text--localized';
    case 'diverged':
      return 'diff-summary-text--reset';
    case 'new':
      return 'diff-summary-text--new';
  }
}

export function getSummaryLink(item: Item): string {
  return `[[mw:${item.srcFullTitle}]]`;
}

export function fixMwLinks(summary: string): string {
  // Reverse link conversion from first form to second.  Ideally we should fix Banana not to do this.
  // <a href="./mw:Special:MyLanguage/WP:TNT" title="mw:Special:MyLanguage/WP:TNT">docs</a>
  // [[mw:Special:MyLanguage/WP:TNT|docs]]
  return summary.replace(new RegExp(/<a href="\.\/([^"]+)" title="\1">([^<]+)<\/a>/, 'g'), (_, lnk, txt) => `[[${lnk}|${txt}]]`).trim();
}
