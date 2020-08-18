import React, { Dispatch, useContext } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSearchBar,
  EuiText,
  SearchFilterConfig
} from '@elastic/eui';

import { groupDefs, Item, schema } from '../types';

import { AllDataContext } from '../contexts/AllData';
import { flatten, map, uniq } from 'lodash';
import { iconsEuiMedium } from '../icons/icons';
import { getLanguages } from '../languages';
import { GroupSelector } from './GroupSelector';
import { SyncButton } from './SyncButton';
import { ToastsContext } from '../contexts/Toasts';
import { SettingsContext } from '../contexts/Settings';

async function getOptions(allItems: Array<Item>, field: ('project')) {
  const values = uniq(allItems.map(v => v[field])).filter(v => v);
  values.sort();

  return values.map(value => ({
    value: value,
    view: (<EuiFlexGroup>
      <EuiFlexItem grow={false}>{iconsEuiMedium[value]}</EuiFlexItem>
      <EuiFlexItem grow={false}>{value[0].toUpperCase() + value.substring(1)}</EuiFlexItem>
    </EuiFlexGroup>)
  }));
}

async function getWikiOptions(allItems: Array<Item>) {
  // TODO: I tried to include iconsEuiMedium[project], but that was too slow
  const values = uniq(allItems.map(v => v.wiki));
  values.sort();
  return values.map(wiki => ({ value: wiki }));
}

export const SearchBar = (
  { query, setQuery, setQueryError, selectedItems, setSelectedItems, groupSelection, setGroupSelection }
    : {
    query: string,
    setQuery: Dispatch<string>,
    setQueryError: Dispatch<string>,
    selectedItems: Set<Item>,
    setSelectedItems: Dispatch<Set<Item>>
    groupSelection: Array<keyof Item>,
    setGroupSelection: Dispatch<Array<keyof Item>>,
  }) => {

  const addToast = useContext(ToastsContext);
  const { isIncrementalSearch } = useContext(SettingsContext);
  let { allItems, status, reload } = useContext(AllDataContext);

  const filters: Array<SearchFilterConfig> = [
    {
      type: 'field_value_selection',
      field: 'type',
      name: 'Type',
      // @ts-ignore
      operator: 'exact',
      multiSelect: false,
      options: [
        {
          value: 'module',
          view: (<EuiFlexGroup>
            <EuiFlexItem grow={false}>{iconsEuiMedium.template}</EuiFlexItem>
            <EuiFlexItem grow={false}>Modules</EuiFlexItem>
          </EuiFlexGroup>)
        },
        {
          value: 'template',
          view: (<EuiFlexGroup>
            <EuiFlexItem grow={false}>{iconsEuiMedium.module}</EuiFlexItem>
            <EuiFlexItem grow={false}>Templates</EuiFlexItem>
          </EuiFlexGroup>)
        },
      ],
    },
    {
      type: 'field_value_selection',
      field: 'status',
      name: 'Status',
      multiSelect: 'or',
      // @ts-ignore
      operator: 'exact',
      options: async () => {
        return map({
          'ok': 'success',
          'outdated': 'warning',
          'unlocalized': 'warning',
          'diverged': 'danger'
        }, (v, k) => ({
          value: k,
          view: <EuiHealth color={v}>{k}</EuiHealth>,
        }));
      },
    },
    {
      type: 'field_value_selection',
      field: 'project',
      name: 'Project',
      multiSelect: 'or',
      // @ts-ignore
      operator: 'exact',
      options: () => getOptions(allItems, 'project'),
    },
    {
      type: 'field_value_selection',
      field: 'lang',
      name: 'Language',
      multiSelect: 'or',
      // @ts-ignore
      operator: 'exact',
      options: async () => {
        const values = uniq(allItems.map(v => v.lang));
        values.sort();
        const allLangs = await getLanguages(addToast);
        return values.map(lang => {
          const langInfo = allLangs[lang] || { name: 'Unknown' };
          let name = langInfo.name;
          if (langInfo.autonym && langInfo.autonym !== langInfo.name) {
            name += ` - ${langInfo.autonym}`;
          }
          return {
            value: lang,
            view: <EuiFlexGroup>
              <EuiFlexItem grow={false} className={'lang-code'}>{lang}</EuiFlexItem>
              <EuiFlexItem grow={false}>{name}</EuiFlexItem>
            </EuiFlexGroup>
          };
        });
      },
    },
    {
      type: 'field_value_selection',
      field: 'wiki',
      name: 'Wiki',
      multiSelect: 'or',
      filterWith: 'includes',
      // @ts-ignore
      operator: 'exact',
      options: () => getWikiOptions(allItems),
    },
    {
      type: 'field_value_selection',
      field: 'protection',
      name: 'Lock',
      multiSelect: 'or',
      // @ts-ignore
      operator: 'exact',
      options: async () => {
        const values = uniq(flatten(allItems.map(v => v.protectionArray))).map(v => v || '').filter(v => v !== '');
        values.sort();
        return values.map(val => ({
          value: val,
          view: (<EuiText>{val}</EuiText>),
        }));
      },
    },
  ];

  const searchBar = <EuiSearchBar
    query={query}
    box={{
      placeholder: 'examples:   en.wikipedia    TNT    lang=en',
      isClearable: true,
      incremental: isIncrementalSearch,
      fullWidth: true,
      schema,
    }}
    filters={filters}
    onChange={({ query, error }: any) => {
      if (error) {
        setQueryError(error.message);
      } else {
        setQueryError('');
        setQuery(query);
      }
    }}
  />;

  const refreshButton = (<EuiButton
    key={'loadItems'}
    iconType={'refresh'}
    isDisabled={status !== 'ready'}
    isLoading={status === 'loading'}
    onClick={() => reload}
  >
    {status === 'loading' ? 'Refreshing...' : 'Refresh'}
  </EuiButton>);

  return (
    <EuiFlexGroup alignItems={'center'}>
      <SyncButton selectedItems={selectedItems} setSelectedItems={setSelectedItems}/>
      <EuiFlexItem style={{ minWidth: '10em' }} grow={false}>
        <GroupSelector groupDefs={groupDefs} groupSelection={groupSelection} setGroupSelection={setGroupSelection}/>
      </EuiFlexItem>
      <EuiFlexItem>{searchBar}</EuiFlexItem>
      <EuiFlexItem grow={false}>{refreshButton}</EuiFlexItem>
    </EuiFlexGroup>
  );

};
