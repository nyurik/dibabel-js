import React, { Dispatch, useContext, useMemo } from 'react';

import { EuiSearchBar, Query } from '@elastic/eui';

import { defaultSearchableFields, Group, groupDefs, Item } from '../types';

import { AllDataContext } from '../contexts/AllData';
import { groupBy, map } from 'lodash';
import { ItemsTable } from './ItemsTable';

import {I18nContext} from "../contexts/I18nContext";

export const Tables = ({ query, queryError, selectedItems, setSelectedItems, groupSelection }
  : {
  queryError: string,
  selectedItems: Set<Item>,
  setSelectedItems: Dispatch<Set<Item>>
  groupSelection: Array<keyof Item>,
  query: string | Query,
}) => {
  let { allItems, status } = useContext(AllDataContext);

  const { i18n } = useContext(I18nContext);

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
    return organizeItemsInGroups(0, filteredItems, ['protection', 'wiki', 'dstTitle', 'status', 'hash']);
  }, [allItems, groupSelection, query]);

  return (<ItemsTable
    groupedItems={groupedItems}
    isLoading={status === 'loading'}
    message={status === 'loading' ? i18n('dibabel-table-loading') : ''}
    error={status === 'error' ? i18n('dibabel-table-loading--error') : queryError}
    selectedItems={selectedItems}
    setSelectedItems={setSelectedItems}
  />);
};
