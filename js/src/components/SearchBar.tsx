import React, { Dispatch, useContext, useState } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSearchBar,
  EuiText,
  SearchFilterConfig
} from '@elastic/eui';

import { groupDefs, Item, schema } from '../services/types';

import { AllDataContext } from '../contexts/AllData';
import { flatten, map, uniq } from 'lodash';
import { iconsEuiMedium } from '../icons/icons';
import { GroupSelector } from './GroupSelector';
import { SyncButton } from './SyncButton';
import { SettingsContext } from '../contexts/Settings';
import { I18nContext } from '../contexts/I18nContext';
import { AddNew } from './AddNew';

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

  const { i18n } = useContext(I18nContext);
  const { languageNames, isIncrementalSearch } = useContext(SettingsContext);
  const { allItems, status } = useContext(AllDataContext);
  const [isAddLangShown, setIsAddLangShown] = useState(false);

  const filters: Array<SearchFilterConfig> = [
    {
      type: 'field_value_selection',
      field: 'type',
      name: i18n('filters-type'),
      operator: 'exact',
      multiSelect: false,
      options: [
        {
          value: 'module',
          view: (<EuiFlexGroup>
            <EuiFlexItem grow={false}>{iconsEuiMedium.module}</EuiFlexItem>
            <EuiFlexItem grow={false}>{i18n('filters-type--modules')}</EuiFlexItem>
          </EuiFlexGroup>)
        },
        {
          value: 'template',
          view: (<EuiFlexGroup>
            <EuiFlexItem grow={false}>{iconsEuiMedium.template}</EuiFlexItem>
            <EuiFlexItem grow={false}>{i18n('filters-type--templates')}</EuiFlexItem>
          </EuiFlexGroup>)
        },
      ],
    },
    {
      type: 'field_value_selection',
      field: 'status',
      name: i18n('filters-status'),
      multiSelect: 'or',
      operator: 'exact',
      options: async () => {
        return map({
          ok: 'success',
          outdated: 'warning',
          unlocalized: 'warning',
          diverged: 'danger'
        }, (v, k) => ({
          value: k,
          view: <EuiHealth color={v}>{i18n(`filters-status-${k}`)}</EuiHealth>,
        }));
      },
    },
    {
      type: 'field_value_selection',
      field: 'project',
      name: i18n('filters-project'),
      multiSelect: 'or',
      operator: 'exact',
      options: () => getOptions(allItems, 'project'),
    },
    {
      type: 'field_value_selection',
      field: 'lang',
      name: i18n('filters-lang'),
      multiSelect: 'or',
      operator: 'exact',
      options: async () => {
        const values = uniq(allItems.map(v => v.lang));
        values.sort();
        return values.map(lang => ({
          value: lang,
          view: <EuiFlexGroup>
            <EuiFlexItem grow={false} className={'lang-code'}>{lang}</EuiFlexItem>
            <EuiFlexItem grow={false}>{languageNames[lang] || i18n('filters-lang--unknown')}</EuiFlexItem>
          </EuiFlexGroup>
        }));
      },
    },
    {
      type: 'field_value_selection',
      field: 'wiki',
      name: i18n('filters-wiki'),
      multiSelect: 'or',
      filterWith: 'includes',
      operator: 'exact',
      options: () => getWikiOptions(allItems),
    },
    {
      type: 'field_value_selection',
      field: 'protection',
      name: i18n('filters-protection'),
      multiSelect: 'or',
      operator: 'exact',
      options: async () => {
        const values = uniq(flatten(allItems.map(v => v.srvCopy.protection))).map(v => v || '').filter(v => v !== '');
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
      placeholder: i18n('filters-searchbar--placeholder'),
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
        setQuery(query.text);
      }
    }}
  />;

  // FIXME I18N once we actually know what we want
  const addLangButton = (<EuiButton
    isDisabled={status !== 'ready'}
    onClick={() => setIsAddLangShown(true)}
  >{i18n('Add new...')}</EuiButton>);

  let addLang;
  if (isAddLangShown) {
    addLang = (<AddNew onClose={() => setIsAddLangShown(false)}/>);
  }

  return (
    <EuiFlexGroup alignItems={'center'}>
      <SyncButton selectedItems={selectedItems} setSelectedItems={setSelectedItems}/>
      <EuiFlexItem style={{ minWidth: '10em' }} grow={false}>
        <GroupSelector groupDefs={groupDefs} groupSelection={groupSelection} setGroupSelection={setGroupSelection}/>
      </EuiFlexItem>
      <EuiFlexItem>{searchBar}</EuiFlexItem>
      <EuiFlexItem grow={false}>{addLangButton}{addLang}</EuiFlexItem>
    </EuiFlexGroup>
  );

};
