import React, { useState } from 'react';

import { EuiCheckbox } from '@elastic/eui/es/components/form/checkbox';
import { EuiButtonIcon } from '@elastic/eui/es/components/button/button_icon';
import { EuiIcon } from '@elastic/eui/es/components/icon';
import { EuiLink } from '@elastic/eui/es/components/link';
import { EuiHealth } from '@elastic/eui/es/components/health';
import { EuiInMemoryTable } from '@elastic/eui/es/components/basic_table';
import { typeIcons } from '../data/icons';

export const ItemsTable = (props) => {
  const [expandedItems, setExpandedItems] = useState(new Set());

  const all_columns = {
    selector: {
      name: '',
      width: '2em',
      render: item => {
        const items = item.isGroup ? item.items : [item];
        const selectable = items.filter(v => v.behind > 0);
        const selectedCount = selectable.filter(v => props.selectedItems.has(v)).length;
        const checked = selectedCount > 0 && selectable.length === selectedCount;
        const disabled = selectable.length === 0;
        const indeterminate = selectedCount > 0 && selectable.length > selectedCount;
        return <EuiCheckbox
          id={`check-${item.key}`}
          checked={checked}
          disabled={disabled}
          indeterminate={indeterminate}
          onChange={() => {
            const clone = new Set(props.selectedItems);
            for (let itm of selectable) {
              if (selectedCount === 0) {
                clone.add(itm);
              } else {
                clone.delete(itm);
              }
            }
            props.setSelectedItems(clone);
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
          onClick: () => props.addToast({
            title: 'Copying...',
            color: 'danger',
            iconType: 'alert',
          }),
        },
        {
          name: 'Diff',
          description: 'Compare with the primary',
          icon: 'inputOutput', // 'magnifyWithPlus' ?
          type: 'icon',
          available: ({ isInSync }) => isInSync === false,
          onClick: props.setItem,
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
      width: '3.3em',
      sortable: true,
      mobileOptions: { show: false },
      render: type => (
        <EuiIcon
          type={typeIcons[type]}
          size="l"
          title={type}
        />),
    },
    title: {
      field: 'srcFullTitle',
      name: 'Source Page',
      sortable: true,
      render: (srcFullTitle, item) => (
        <EuiLink href={item.srcTitleUrl} target="_blank">{srcFullTitle}</EuiLink>
      ),
    },
    site: {
      field: 'site',
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
      name: 'OK',
      description: 'Number of up to date pages.',
      render: item => {
        if (item.groupInSync > 0) {
          return <EuiHealth title={'Number of up to date pages.'}
                            color={'success'}>{`${item.groupInSync} pages`}</EuiHealth>;
        }
      },
    },
    groupBehind: {
      name: 'Outdated',
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

  const itemIdToExpandedRowMap = {};
  for (let item of props.groupedItems.groups) {
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
    items={props.groupedItems.groups}
    loading={props.isLoading}
    columns={props.groupedItems.columns.map(v => all_columns[v])}
    // search={search}
    itemId={'key'}
    sorting={true}
    message={props.message}
    error={props.error}
    itemIdToExpandedRowMap={itemIdToExpandedRowMap}
    isExpandable={true}
    hasActions={true}
  />);
};
