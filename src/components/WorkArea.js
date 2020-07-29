import React, { useEffect, useMemo, useState } from 'react';
import { getItems, defaultSearchFields } from '../data/Store';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import map from 'lodash/map';
import { EuiButton } from '@elastic/eui/es/components/button';
import { ItemsTable } from './ItemsTable';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui/es/components/flex';
import { EuiSearchBar } from '@elastic/eui/es/components/search_bar';
import { EuiIcon } from '@elastic/eui/es/components/icon';
import { siteIcons, typeIcons } from '../data/icons';
import { EuiHealth } from '@elastic/eui/es/components/health';
import { getLanguages } from '../data/languages';
import { EuiSpacer } from '@elastic/eui/es/components/spacer';

const initialQuery = EuiSearchBar.Query.MATCH_ALL;

const schema = {
  strict: true,
  fields: {
    status: { type: 'string' },
    type: { type: 'string' },
    site: { type: 'string' },
    ok: { type: 'boolean' },
    behind: { type: 'number' },
    diverged: { type: 'boolean' },
    lang: { type: 'string' },
    title: { type: 'string' },
    srcSite: { type: 'string' },
    srcFullTitle: { type: 'string' },
    srcTitleUrl: { type: 'string' },
    dstLangSite: { type: 'string' },
    dstFullTitle: { type: 'string' },
    dstTitle: { type: 'string' },
    dstTitleUrl: { type: 'string' },
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
    console.log('original data', allItems);
    try {
      console.log('esQueryDsl', EuiSearchBar.Query.toESQuery(query));
    } catch (e) {
      console.error(`error in esQueryDsl: ${e}`);
    }
    try {
      console.log('esQueryString', EuiSearchBar.Query.toESQueryString(query));
    } catch (e) {
      console.error(`error in esQueryString: ${e}`);
    }
    return EuiSearchBar.Query.execute(query, allItems, { defaultSearchFields });
  }, [allItems, query]);

  const [groupings] = useState(['srcTitleUrl']);

  const groupedItems = useMemo(() => {
    function groupItems(groupIndex, items) {
      const group = groupings[groupIndex];
      return {
        columns: ['expander', 'selector', 'type', 'title', 'countOk', 'countOutdated', 'countDiverged'],
        groups: map(groupBy(items, v => v[group]), groupItems => {
          const first = groupItems[0];
          return {
            key: first[group],
            type: first.type,
            srcSite: first.srcSite,
            srcFullTitle: first.srcFullTitle,
            title: first.title,
            srcTitleUrl: first.srcTitleUrl,
            isGroup: true,
            countOk: groupItems.filter(v => v.ok).length,
            countOutdated: groupItems.filter(v => v.outdated).length,
            countDiverged: groupItems.filter(v => v.diverged).length,
            items: groupItems,
            expandItems: groupItems,
            expandColumns: ['selector', 'actions', 'site', 'dstTitle', 'status'],
          };
        })
      };
    }

    return groupItems(0, filteredItems);
  }, [filteredItems, groupings]);

  console.log(filteredItems);
  console.log(groupedItems);

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
      options: () => getLangOptions(),
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
      <EuiSpacer size={'l'}/>
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
