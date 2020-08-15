import { DependencyList, Dispatch, useEffect, useState, useRef } from 'react';
import { Item, ItemTypeType } from './data/types';

// Using full root for the ease of debugging locally. Eventually should probably use '/'
export const rootUrl = 'https://dibabel.toolforge.org/';
// export const rootUrl = '/';

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
  const response = await fetch(`${rootUrl}api/${domain}`, {
    method: 'POST',
    mode: 'cors', // TODO: possibly use a different mode here?  no-cors, cors, same-origin
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
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

export const splitNs = (title: string): [ItemTypeType, string] => {
  const pos = title.indexOf(':');
  return [title.substring(0, pos).toLowerCase() as ItemTypeType, title.substring(pos + 1)];
};

export const sleep = (durationsMs: number) => {
  return new Promise(r => setTimeout(r, durationsMs));
};

export const itemDiffLink = ({ dstTitle, srcRevId, matchedRevId }: Item) => {
  return `https://www.mediawiki.org/w/index.php?title=${encodeURIComponent(dstTitle)}&type=revision&diff=${srcRevId}&oldid=${matchedRevId}`;
};
