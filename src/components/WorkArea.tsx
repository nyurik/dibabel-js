import React, { useEffect, useMemo, useState } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiPopover,
  EuiSearchBar,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  SearchFilterConfig
} from '@elastic/eui';

import { defaultSearchableFields, getItems, Item } from '../data/Store';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import map from 'lodash/map';
import { ItemsTable } from './ItemsTable';
import { siteIcons, typeIcons } from '../data/icons';
import { getLanguages, Toast } from '../data/languages';
import { usePersistedJsonState } from '../utils';
import { UserInfo } from '../data/users';

const initialQuery = EuiSearchBar.Query.MATCH_ALL;

const schema = {
  strict: true,
  fields: {
    status: { type: 'string' },
    type: { type: 'string' },
    ok: { type: 'boolean' },
    behind: { type: 'number' },
    diverged: { type: 'boolean' },
    lang: { type: 'string' },
    project: { type: 'string' },
    title: { type: 'string' },
    srcSite: { type: 'string' },
    srcFullTitle: { type: 'string' },
    srcTitleUrl: { type: 'string' },
    dstSite: { type: 'string' },
    dstFullTitle: { type: 'string' },
    dstTitle: { type: 'string' },
    dstTitleUrl: { type: 'string' },
    srcText: { type: 'string' },
    dstText: { type: 'string' },
  },
};

export const WorkArea = (props: {
  addToast: (toast: Toast) => void,
  setItem: (item?: Item) => void,
  user: UserInfo,
}) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<Item>>(new Set());
  const [query, setQuery] = useState(initialQuery);

  const [allItems, setAllItems] = useState<Array<Item>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGroupListOpen, setIsGroupListOpen] = useState(false);

  useEffect(() => {
    if (isLoading) {
      (async () => {
        setAllItems([]);
        setMessage('Loading ...');
        setError('');

        try {
          setAllItems(await getItems());
        } catch (err) {
          setError(`Unable to load data. ${err}`);
        }

        setIsLoading(false);
        setMessage('');
        setSelectedItems(new Set());
      })();
    }
  }, [isLoading]);

  const filteredItems = useMemo(() => {
    // console.log('original data', allItems);
    // try {
    //   console.log('esQueryDsl', EuiSearchBar.Query.toESQuery(query));
    // } catch (e) {
    //   console.error(`error in esQueryDsl: ${e}`);
    // }
    // try {
    //   console.log('esQueryString', EuiSearchBar.Query.toESQueryString(query));
    // } catch (e) {
    //   console.error(`error in esQueryString: ${e}`);
    // }
    return EuiSearchBar.Query.execute(query, allItems, { defaultSearchableFields });
  }, [allItems, query]);

  // console.log('filtered data', filteredItems);

  function getSelectedGroupNames(groupSelection: Array<EuiSelectableOption>): Array<string> {
    return groupSelection.filter(v => v.checked).map((v: any) => v['data-group']);
  }

  const [groupSelection, setGroupSelection] = usePersistedJsonState<Array<EuiSelectableOption>, any>(
    'groupSelection',
    ['srcTitleUrl'],
    (selection) => {
      return [
        { label: 'by language', 'data-group': 'lang' },
        { label: 'by project', 'data-group': 'project' },
        { label: 'by wiki', 'data-group': 'dstSite' },
        { label: 'by page', 'data-group': 'srcTitleUrl' }
      ].map(v => selection.includes(v['data-group']) ? Object.assign(v, { checked: 'on' }) : v);
    },
    getSelectedGroupNames);

  const groupedItems = useMemo(() => {
    const groupDefs: any = {
      'lang': {
        columns: ['lang'],
        fields: ['lang']
      },
      'project': {
        columns: ['project'],
        fields: ['dstSite', 'project', 'lang']
      },
      'srcTitleUrl': {
        columns: ['type', 'title'],
        fields: ['type', 'srcSite', 'srcFullTitle', 'title', 'srcTitleUrl']
      },
      'dstSite': {
        columns: ['dstSite'],
        fields: ['lang', 'project', 'dstSite']
      },
    };

    const groupings = getSelectedGroupNames(groupSelection);

    function organizeItemsInGroups(groupIndex: number, itemList: Array<Item>, parentColumns: Array<string>, parentKey = '') {
      if (itemList.length === 1 || groupIndex === groupings.length) {
        return { items: itemList, columns: ['selector', 'actions'].concat(parentColumns), isLastGroup: true };
      }

      const groupKey = groupings[groupIndex];
      const groupDef = groupDefs[groupKey];
      const columns = parentColumns.filter(v => !groupDef.columns.includes(v));

      const items: Array<Item> = map(groupBy(itemList, v => v[groupKey]), allSubItems => {
        const first = allSubItems[0];
        const key = parentKey + '/' + first[groupKey];
        return {
          isGroup: true,
          key: key,
          allSubItems: allSubItems,
          countOk: allSubItems.filter(v => v.ok).length,
          countOutdated: allSubItems.filter(v => v.outdated).length,
          countDiverged: allSubItems.filter(v => v.diverged).length,
          ...Object.fromEntries(groupDef.fields.map((v: string) => [v, first[v]])),
          ...organizeItemsInGroups(groupIndex + 1, allSubItems, columns, key)
        };
      });
      items.sort((a, b) => a.key.localeCompare(b.key));

      return {
        columns: ['expander', 'selector'].concat(groupDef.columns, 'countOk', 'countOutdated', 'countDiverged'),
        items: items
      };
    }

    return organizeItemsInGroups(0, filteredItems, ['type', 'dstSite', 'dstTitle', 'status']);
  }, [filteredItems, groupSelection]);

  const getOptions = async (iconsMap: any) => {
    // FIXME: Switch to real data once available. For now keep showing all for demo.
    // const values = uniq(allItems.map(v => v.project));
    // values.sort();
    const values = Object.keys(iconsMap);

    return values.map(value => ({
      value: value,
      view: (<EuiFlexGroup>
        <EuiFlexItem grow={false}><EuiIcon color={'#FFFFFF'} type={iconsMap[value]} size={'m'}/></EuiFlexItem>
        <EuiFlexItem grow={false}>{value[0].toUpperCase() + value.substring(1)}</EuiFlexItem>
      </EuiFlexGroup>)
    }));
  };

  const getLangOptions = async () => {
    const values = uniq(allItems.map(v => v.lang));
    values.sort();
    const allLangs = await getLanguages(props.addToast);
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
  };

  const getStatuses = async () => {
    return map({
      'ok': 'success',
      'outdated': 'warning',
      'diverged': 'danger'
    }, (v, k) => ({
      value: k,
      view: <EuiHealth color={v}>{k}</EuiHealth>,
    }));
  };

  const filters: Array<SearchFilterConfig> = [
    {
      type: 'field_value_selection',
      field: 'status',
      name: 'Status',
      multiSelect: 'or',
      options: () => getStatuses(),
    },
    {
      type: 'field_value_selection',
      field: 'type',
      name: 'Type',
      multiSelect: 'or',
      options: () => getOptions(typeIcons),
    },
    {
      type: 'field_value_selection',
      field: 'project',
      name: 'Project',
      multiSelect: 'or',
      options: () => getOptions(siteIcons),
    },
    {
      type: 'field_value_selection',
      field: 'lang',
      name: 'Language',
      multiSelect: 'or',
      options: () => getLangOptions(),
    },
  ];

  const onQueryChange = ({ query, error }: any) => {
    if (error) {
      setError(error.message);
    } else {
      setError('');
      setQuery(query);
    }
  };

  const renderToolsLeft = () => {
    const results = [];
    if (selectedItems.size > 0) {
      const onClick = async () => {
        // store.processItems(...);
        setSelectedItems(new Set());
      };
      results.push(
        <EuiFlexItem grow={false}>
          <EuiButton color="danger" iconType="trash" onClick={onClick}>
            Sync {selectedItems.size} items
          </EuiButton>
        </EuiFlexItem>
      );
    }

    results.push(
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={<EuiButton
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setIsGroupListOpen(!isGroupListOpen)}
          >Group by...</EuiButton>}
          isOpen={isGroupListOpen}
          closePopover={() => setIsGroupListOpen(false)}>
          <EuiSelectable
            searchable={false}
            style={{ width: 200 }}
            onChange={groupChoices => setGroupSelection(groupChoices)}
            options={groupSelection}>
            {(list) => (<>{list}</>)}
          </EuiSelectable>
        </EuiPopover>
      </EuiFlexItem>
    );

    return <>{results}</>;
  };

  return (
    <>
      <EuiFlexGroup alignItems="center">
        {renderToolsLeft()}
        <EuiFlexItem>
          <EuiSearchBar
            defaultQuery={initialQuery}
            box={{
              isClearable: true,
              // placeholder: '',
              incremental: true,
              fullWidth: true,
              schema,
            }}
            filters={filters}
            onChange={onQueryChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            key="loadItems"
            iconType="refresh"
            isDisabled={isLoading}
            isLoading={isLoading}
            onClick={() => setIsLoading(true)}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size={'l'}/>
      <ItemsTable
        groupedItems={groupedItems}
        isLoading={isLoading}
        message={message}
        error={error}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        {...props}
      />
    </>);
};
