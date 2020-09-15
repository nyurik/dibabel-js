import React, { useState, useEffect, useContext } from 'react';

import { EuiSpacer } from '@elastic/eui';

import { groupDefs, Item } from '../services/types';
import { usePersistedJsonState, usePersistedState } from '../services/utils';
import { SearchBar } from './SearchBar';
import { Tables } from './Tables';
import { ItemViewer } from './ItemViewer';
import { ResetContext } from '../contexts/ResetContext';

const initGroupSelection: Array<keyof Item> = ['srcTitleUrl'];

export const WorkArea = () => {
  const { resetIndex } = useContext(ResetContext);
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
