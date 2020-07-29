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
          available: ({ outdated }) => outdated,
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
          available: ({ ok }) => !ok,
          onClick: props.setItem,
        },
      ],
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
      field: 'dstLangSite',
      name: 'Site',
      sortable: true,
    },
    dstTitle: {
      name: 'Page',
      render: item => (
        <EuiLink href={item.dstTitleUrl} target="_blank">{item.dstFullTitle}</EuiLink>
      ),
    },
    status: {
      field: 'status',
      name: 'Status',
      sortable: true,
      render: (status, item) => {
        let color, label, title;
        switch (status) {
          case 'ok':
            [color, label, title] = ['success', status, 'The target page is up to date with the primary'];
            break;
          case 'outdated':
            [color, label, title] = ['warning', `Outdated by ${item.behind} rev`, `The target page is outdated by ${item.behind} versions, and can be updated.`];
            break;
          case 'diverged':
            [color, label, title] = ['danger', status, 'The target page has been modified and cannot be updated automatically.'];
            break;
          default:
            throw new Error(`Unknown status ${status}`);
        }
        return <EuiHealth title={title} color={color}>{label}</EuiHealth>;
      },
    },
    countOk: {
      name: 'OK',
      field: 'countOk',
      sortable: true,
      description: 'Number of up to date pages.',
      render: value => {
        if (value > 0) {
          return <EuiHealth title={'Number of up to date pages.'}
                            color={'success'}>{`${value} pages`}</EuiHealth>;
        } else {
          return '-';
        }
      },
    },
    countOutdated: {
      name: 'Outdated',
      field: 'countOutdated',
      sortable: true,
      render: value => {
        if (value > 0) {
          return <EuiHealth title={`${value} pages are behind`}
                            color={'warning'}>{`${value} pages`}</EuiHealth>;
        } else {
          return '-';
        }
      },
    },
    countDiverged: {
      name: 'Diverged',
      field: 'countDiverged',
      sortable: true,
      description: 'Number of pages with local modifications.',
      render: value => {
        if (value > 0) {
          return <EuiHealth title={'Number of pages with local modifications.'}
                            color={'danger'}>{`${value} pages`}</EuiHealth>;
        } else {
          return '-';
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
