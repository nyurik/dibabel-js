import React, { useEffect, useMemo, useState } from 'react';
import { getItems } from '../data/Store';
import groupBy from 'lodash/groupBy';
import countBy from 'lodash/countBy';
import map from 'lodash/map';

import { EuiCheckbox } from '@elastic/eui/es/components/form/checkbox';
import { EuiButtonIcon } from '@elastic/eui/es/components/button/button_icon';
import { EuiIcon } from '@elastic/eui/es/components/icon';
import { EuiLink } from '@elastic/eui/es/components/link';
import { EuiHealth } from '@elastic/eui/es/components/health';
import { EuiButton } from '@elastic/eui/es/components/button';
import { EuiInMemoryTable } from '@elastic/eui/es/components/basic_table';

export const WorkArea = () => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState(new Set());

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
      setExpandedItems(new Set());
      setSelectedItems(new Set());
    }

    if (isLoading) {
      // noinspection JSIgnoredPromiseFromCall
      loadDataAsync();
    }

  }, [isLoading]);

  const [groupings] = useState(['srcTitleUrl']);

  const groupedItems = useMemo(() => {
    function groupItems(groupIndex, items) {
      const group = groupings[groupIndex];
      return {
        columns: ['expander', 'selector', 'type', 'srcTitle', 'groupInSync', 'groupBehind', 'groupDiverged'],
        groups: map(groupBy(items, v => v[group]), vals => {
          let behind = countBy(vals.map(v => v.behind).filter(v => v !== undefined));
          let inSync = 0;
          if (behind.hasOwnProperty('0')) {
            inSync = behind['0'];
            delete behind['0'];
          }
          behind = map(behind, (v, k) => ({ behind: parseInt(k), count: v }));
          behind.sort(v => v.behind);
          let diverged = vals.map(v => v.diverged).filter(v => v !== undefined).length;
          const expandItems = vals;
          const first = vals[0];

          return {
            key: first[group],
            type: first.type,
            srcSite: first.srcSite,
            srcFullTitle: first.srcFullTitle,
            srcTitle: first.srcTitle,
            srcTitleUrl: first.srcTitleUrl,
            isGroup: true,
            groupInSync: inSync, // count
            groupBehind: behind,  // [{behind, count}]
            groupDiverged: diverged, // count
            items: vals,
            expandItems: expandItems,
            expandColumns: ['selector', 'actions', 'dstSite', 'dstTitle', 'behind'],
          };
        })
      };
    }

    return groupItems(0, allItems);
  }, [groupings, allItems]);

  const all_columns = {
    selector: {
      name: '',
      width: '2em',
      render: item => {
        const items = item.isGroup ? item.items : [item];
        const selectable = items.filter(v => v.behind > 0);
        const selectedCount = selectable.filter(v => selectedItems.has(v)).length;
        const checked = selectedCount > 0 && selectable.length === selectedCount;
        const disabled = selectable.length === 0;
        const indeterminate = selectedCount > 0 && selectable.length > selectedCount;
        return <EuiCheckbox
          id={`check-${item.key}`}
          checked={checked}
          disabled={disabled}
          indeterminate={indeterminate}
          onChange={() => {
            const clone = new Set(selectedItems);
            for (let itm of selectable) {
              if (selectedCount === 0) {
                clone.add(itm);
              } else {
                clone.delete(itm);
              }
            }
            setSelectedItems(clone);
          }}
        />;
      },
    },
    actions: {
      name: 'Actions',
      width: '70px',
      actions: [
        {
          name: 'Copy',
          description: 'Update code from primary source',
          icon: 'save',
          type: 'icon',
          color: 'danger',
          available: ({ behind }) => behind > 0,
          onClick: () => alert('save'),
        },
        {
          name: 'Diff',
          description: 'Compare with the primary',
          icon: 'inputOutput', // 'magnifyWithPlus' ?
          type: 'icon',
          available: ({ isInSync }) => isInSync === false,
          onClick: () => alert('diff'),
        },
      ],
    },
    expander: {
      width: '2.5em',
      isExpander: true,
      render: item => (
        <EuiButtonIcon
          onClick={() => toggleExpandGroup(item)}
          aria-label={expandedItems.has(item) ? 'Collapse' : 'Expand'}
          iconType={expandedItems.has(item) ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
    type: {
      field: 'type',
      name: 'Type',
      width: '60px',
      sortable: true,
      mobileOptions: { show: false },
      render: type => (
        <EuiIcon
          type={type === 'module'
            ? 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Lua-Logo.svg'
            : 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Template_icon.svg'}
          size="l"
          title={type}
        />),
    },
    srcTitle: {
      field: 'srcFullTitle',
      name: 'Source Page',
      sortable: true,
      render: (srcFullTitle, item) => (
        <EuiLink href={item.srcTitleUrl} target="_blank">{srcFullTitle}</EuiLink>
      ),
    },
    dstSite: {
      field: 'dstSite',
      name: 'Site',
      sortable: true,
    },
    dstTitle: {
      name: 'Page',
      render: item => (
        <EuiLink href={item.dstTitleUrl} target="_blank">{item.dstFullTitle}</EuiLink>
      ),
    },
    behind: {
      field: 'behind',
      name: 'Status',
      sortable: true,
      render: behind => {
        let color, label, title;
        if (behind === 0) {
          [color, label, title] = ['success', 'ok', 'The target page is up to date with the primary'];
        } else if (behind > 0) {
          [color, label, title] = ['warning', `Outdated by ${behind} rev`, `The target page is outdated by ${behind} versions, and can be updated.`];
        } else {
          [color, label, title] = ['danger', 'Modified', 'The target page has been modified and cannot be updated automatically.'];
        }
        return <EuiHealth title={title} color={color}>{label}</EuiHealth>;
      },
    },
    groupInSync: {
      name: 'In Sync',
      description: 'Number of up to date pages.',
      render: item => {
        if (item.groupInSync > 0) {
          return <EuiHealth title={'Number of up to date pages.'}
                            color={'success'}>{`${item.groupInSync} pages`}</EuiHealth>;
        }
      },
    },
    groupBehind: {
      name: 'Behind',
      render: item => {
        if (!item.groupBehind) {
          return '';
        }
        let title, label;
        if (item.groupBehind.length === 1) {
          label = `${item.groupBehind[0].count} behind by ${item.groupBehind[0].behind} rev`;
          title = `${item.groupBehind[0].count} pages are behind by ${item.groupBehind[0].behind} revisions`;
        } else {
          label = `${item.groupBehind.reduce((a, v) => a + v.count, 0)} pages: ` +
            item.groupBehind.map(v => `by\u00A0${v.behind}\u00A0x${v.count}`).join(', ');
          title = 'Number of revisions fallen behind, with (page count)';
        }
        return <EuiHealth title={title} color={'warning'}>{label}</EuiHealth>;
      },
    },
    groupDiverged: {
      name: 'Diverged',
      description: 'Number of pages with local modifications.',
      render: item => {
        if (item.groupDiverged > 0) {
          return <EuiHealth title={'Number of pages with local modifications.'}
                            color={'danger'}>{`${item.groupDiverged} pages`}</EuiHealth>;
        }
      },
    },
  };

  function toggleExpandGroup(item) {
    const clone = new Set(expandedItems);
    if (clone.has(item)) {
      clone.delete(item);
    } else {
      clone.add(item);
    }
    setExpandedItems(clone);
  }

  const renderToolsLeft = () => {
    if (selectedItems.size === 0) {
      return;
    }

    const onClick = async () => {
      // store.processItems(...);
      setSelectedItems(new Set());
    };

    return (
      <EuiButton color="danger" iconType="trash" onClick={onClick}>
        Sync {selectedItems.size} items
      </EuiButton>
    );
  };

  const renderToolsRight = () => {
    if (isLoading) {
      return <EuiButton key="loadItems" isDisabled={true} isLoading={true}>
        Refreshing...
      </EuiButton>;
    } else {
      return <EuiButton key="loadItems" iconType="refresh" onClick={() => setIsLoading(true)}>
        Refresh
      </EuiButton>;
    }
  };

  const search = {
    toolsLeft: renderToolsLeft(),
    toolsRight: renderToolsRight(),
    box: { incremental: true },
  };

  const itemIdToExpandedRowMap = {};
  for (let item of groupedItems.groups) {
    if (expandedItems.has(item)) {
      itemIdToExpandedRowMap[item.key] = (<EuiInMemoryTable
        className={'sub-table'}
        items={item.expandItems}
        columns={item.expandColumns.map(v => all_columns[v])}
        itemId={'key'}
        sorting={true}
      />);
    }
  }

  return (<EuiInMemoryTable
    items={groupedItems.groups}
    loading={isLoading}
    columns={groupedItems.columns.map(v => all_columns[v])}
    search={search}
    itemId={'key'}
    sorting={true}
    message={message}
    error={error}
    itemIdToExpandedRowMap={itemIdToExpandedRowMap}
    isExpandable={true}
    hasActions={true}
  />);
};
