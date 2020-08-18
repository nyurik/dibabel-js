import React, { useState } from 'react';

import { EuiSpacer } from '@elastic/eui';

import { groupDefs, Item } from '../types';
import { usePersistedJsonState, usePersistedState } from '../utils';
import { SearchBar } from './SearchBar';
import { Tables } from './Tables';
import { ItemViewer } from './ItemViewer';

export const WorkArea = () => {
  let [queryError, setQueryError] = useState('');
  let [selectedItems, setSelectedItems] = useState<Set<Item>>(() => new Set());
  let [query, setQuery] = usePersistedState<string>('query', '', v => v, v => v);

  const [rawGroupSelection, setGroupSelection] = usePersistedJsonState<Array<keyof Item>>('groupSelection', ['srcTitleUrl']);

  // Just in case local store has some weird values, filter them out
  const groupSelection = rawGroupSelection.filter(v => groupDefs.hasOwnProperty(v));

  return (
    <>
      <SearchBar query={query} setQuery={setQuery} setQueryError={setQueryError} selectedItems={selectedItems}
                 setSelectedItems={setSelectedItems}
                 groupSelection={groupSelection} setGroupSelection={setGroupSelection}/>
      <EuiSpacer size={'l'}/>
      <Tables queryError={queryError} selectedItems={selectedItems} setSelectedItems={setSelectedItems}
              groupSelection={groupSelection} query={query}/>
      <ItemViewer/>
    </>);
};
