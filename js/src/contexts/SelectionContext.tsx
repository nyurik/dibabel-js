import React, { Dispatch, useContext, useEffect, useMemo, useState } from 'react';
import { defaultSearchableFields, Group, groupDefs, Item, Props } from '../services/types';
import { ResetContext } from './ResetContext';
import { usePersistedJsonState, usePersistedState } from '../services/utils';
import { AllDataContext } from './AllData';
import { EuiSearchBar } from '@elastic/eui';
import { groupBy, map } from 'lodash';

export type SelectionContextType = {
  query: string,
  setQuery: Dispatch<string>,
  setQueryError: Dispatch<string>,
  selectedItems: Set<Item>,
  setSelectedItems: Dispatch<Set<Item>>
  groupSelection: Array<keyof Item>,
  setGroupSelection: Dispatch<Array<keyof Item>>,
  groupedItems: any,
  queryError: string,
}

export const SelectionContext = React.createContext<SelectionContextType>({} as SelectionContextType);

const initGroupSelection: Array<keyof Item> = ['srcTitleUrl'];

export const SelectionProvider = ({ children }: Props) => {
  const { resetIndex } = useContext(ResetContext);
  const { allItems } = useContext(AllDataContext);

  const [queryError, setQueryError] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<Item>>(() => new Set());
  const [query, setQuery] = usePersistedState<string>('query', '', v => v === '[object Object]' ? '' : v, v => v);
  const [rawGroupSelection, setGroupSelection] = usePersistedJsonState<Array<keyof Item>>('groupSelection', initGroupSelection);

  useEffect(() => {
    if (resetIndex) {
      setSelectedItems(new Set());
      setQuery('');
      setGroupSelection(initGroupSelection);
    }
    // Should only trigger when resetIndex changes. The setters are immutable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetIndex]);

  // Just in case local store has some weird values, filter them out
  const groupSelection = rawGroupSelection.filter(v => groupDefs.hasOwnProperty(v));

  const groupedItems = useMemo(() => {
    function makeLastItem(items: Array<Item>, parentColumns: Array<string>) {
      return { items, columns: ['selector'].concat(parentColumns), isLastGroup: true };
    }

    function organizeItemsInGroups(groupIndex: number, itemList: Array<Item>, parentColumns: Array<keyof Item>, parentKey = '') {
      if (itemList.length === 1 || groupIndex === groupSelection.length) {
        return makeLastItem(itemList, parentColumns);
      }

      const groupKey = groupSelection[groupIndex];
      const groupDef = groupDefs[groupKey];
      const columns = parentColumns.filter(v => !groupDef.columns.includes(v));

      const groupedData = groupBy(itemList, v => v[groupKey]);
      const values = Object.values(groupedData);
      if (values.length === 1 || values.every(v => v.length === 1)) {
        return makeLastItem(itemList, parentColumns);
      }

      const items: Array<Group> = map(groupedData, allSubItems => {
        const first = allSubItems[0];
        const key = parentKey + '/' + first[groupKey];
        return {
          key: key,
          allSubItems: allSubItems,
          countOk: allSubItems.filter(v => v.status === 'ok').length,
          countUnlocalized: allSubItems.filter(v => v.status === 'unlocalized').length,
          countOutdated: allSubItems.filter(v => v.status === 'outdated').length,
          countDiverged: allSubItems.filter(v => v.status === 'diverged').length,
          ...Object.fromEntries(groupDef.columns.map(v => [v, first[v]])),
          ...Object.fromEntries((groupDef.extra_columns ?? []).map(v => [v, first[v]])),
          ...organizeItemsInGroups(groupIndex + 1, allSubItems, columns, key)
        };
      });
      items.sort((a, b) => a.key.localeCompare(b.key));

      return {
        columns: ['expander', 'selector'].concat(groupDef.columns, 'countOk', 'countUnlocalized', 'countOutdated', 'countDiverged'),
        items: items
      };
    }

    const filteredItems = EuiSearchBar.Query.execute(query, allItems, { defaultSearchableFields });
    return organizeItemsInGroups(0, filteredItems, ['protection', 'wiki', 'dstTitle', 'status', 'sortDepsStatus', 'hash']);
  }, [allItems, groupSelection, query]);

  return (
    <SelectionContext.Provider
      value={{
        query,
        setQuery,
        setQueryError,
        selectedItems,
        setSelectedItems,
        groupSelection,
        setGroupSelection,
        groupedItems,
        queryError,
      }}>
      {children}
    </SelectionContext.Provider>
  );
};
