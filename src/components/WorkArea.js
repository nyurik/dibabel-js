import React, { useEffect, useMemo, useState } from 'react';
import { getItems } from '../data/Store';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import countBy from 'lodash/countBy';
import map from 'lodash/map';
import { EuiButton } from '@elastic/eui/es/components/button';
import { ItemsTable } from './ItemsTable';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui/es/components/flex';
import { EuiSearchBar } from '@elastic/eui/es/components/search_bar';
import { EuiIcon } from '@elastic/eui/es/components/icon';
import { siteIcons, typeIcons } from '../data/icons';
import { EuiHealth } from '@elastic/eui/es/components/health';

const initialQuery = EuiSearchBar.Query.MATCH_ALL;

const defaultFields = [
  'status', 'type', 'site', 'behind', 'lang', 'title', 'dstTitle',
];

const schema = {
  strict: true,
  fields: {
    status: { type: 'string' },
    type: { type: 'string' },
    site: { type: 'string' },
    behind: { type: 'number' },
    lang: { type: 'string' },
    title: { type: 'string' },
    srcSite: { type: 'string' },
    srcFullTitle: { type: 'string' },
    srcTitleUrl: { type: 'string' },
    dstLangSite: { type: 'string' },
    dstFullTitle: { type: 'string' },
    dstTitle: { type: 'string' },
    dstTitleUrl: { type: 'string' },
    isInSync: { type: 'string' },
    diverged: { type: 'number' },
    srcText: { type: 'string' },
    dstText: { type: 'string' },
  },
};

export const WorkArea = (props) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [query, setQuery] = useState(initialQuery);

  const [allItems, setAllItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDataAsync() {
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
    }

    if (isLoading) {
      // noinspection JSIgnoredPromiseFromCall
      loadDataAsync();
    }

  }, [isLoading]);

  const filteredItems = useMemo(() => {
    return EuiSearchBar.Query.execute(query, allItems, { defaultFields });
  }, [allItems, query]);

  const [groupings] = useState(['srcTitleUrl']);

  const groupedItems = useMemo(() => {
    function groupItems(groupIndex, items) {
      const group = groupings[groupIndex];
      return {
        columns: ['expander', 'selector', 'type', 'title', 'groupInSync', 'groupBehind', 'groupDiverged'],
        groups: map(groupBy(items, v => v[group]), vals => {
          let behind = countBy(vals.map(v => v.behind).filter(v => v !== undefined));
          let inSync = 0;
          if (behind.hasOwnProperty('0')) {
            inSync = behind['0'];
            delete behind['0'];
          }
          behind = map(behind, (v, k) => ({ behind: parseInt(k), count: v }));
          behind.sort(v => v.behind);
          let diverged = vals.map(v => v.diverged).filter(v => v).length;
          const expandItems = vals;
          const first = vals[0];

          return {
            key: first[group],
            type: first.type,
            srcSite: first.srcSite,
            srcFullTitle: first.srcFullTitle,
            title: first.title,
            srcTitleUrl: first.srcTitleUrl,
            isGroup: true,
            groupInSync: inSync, // count
            groupBehind: behind,  // [{behind, count}]
            groupDiverged: diverged, // count
            items: vals,
            expandItems: expandItems,
            expandColumns: ['selector', 'actions', 'site', 'dstTitle', 'behind'],
          };
        })
      };
    }

    return groupItems(0, filteredItems);
  }, [filteredItems, groupings]);

  const getOptions = async (iconsMap) => {
    // FIXME: Switch to real data once available. For now keep showing all for demo.
    // const values = uniq(allItems.map(v => v.site));
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

  const getLanguages = async () => {
    const values = uniq(allItems.map(v => v.lang));
    values.sort();
    return values.map(value => ({
      value: value,
      view: (<EuiFlexGroup>
        <EuiFlexItem grow={false}><EuiIcon
          type={`https://commons.wikimedia.org/wiki/Special:Redirect/file/File:ISO%20639%20Icon%20${value}.svg`}
          size={'m'}/></EuiFlexItem>
        <EuiFlexItem grow={false}>{value}</EuiFlexItem>
      </EuiFlexGroup>)
    }));
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

  const filters = [
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
      field: 'site',
      name: 'Site',
      multiSelect: 'or',
      options: () => getOptions(siteIcons),
    },
    {
      type: 'field_value_selection',
      field: 'lang',
      name: 'Language',
      multiSelect: 'or',
      options: () => getLanguages(),
    },
  ];

  const onQueryChange = ({ query, error }) => {
    if (error) {
      setError(error.message);
    } else {
      setError('');
      setQuery(query);
    }
  };

  const renderToolsLeft = () => {
    if (selectedItems.size === 0) {
      return null;
    }

    const onClick = async () => {
      // store.processItems(...);
      setSelectedItems(new Set());
    };

    return (
      <EuiFlexItem grow={false}>
        <EuiButton color="danger" iconType="trash" onClick={onClick}>
          Sync {selectedItems.size} items
        </EuiButton>
      </EuiFlexItem>
    );
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
      <ItemsTable
        groupedItems={groupedItems}
        loading={isLoading}
        message={message}
        error={error}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        {...props}
      />
    </>);
};
