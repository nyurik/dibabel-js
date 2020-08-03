import { DependencyList, useEffect, useState } from 'react';

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
): [T, (value: T) => void] {

  const [value, setValue] = useState(
    () => deserializer(localStorage.getItem(key) ?? initValue));

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
): [TValue, (value: TValue) => void] {
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
