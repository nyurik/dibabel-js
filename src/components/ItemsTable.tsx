import React, { useState } from 'react';

import {
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiCheckbox,
  EuiHealth,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink
} from '@elastic/eui';

import { typeIcons } from '../data/icons';
import { AddToast } from '../data/languages';
import { Item } from '../data/Store';

export const ItemsTable = (
  props: {
    isLoading: boolean,
    message: string,
    error: string,
    groupedItems: any,
    selectedItems: Set<Item>,
    setSelectedItems: (value: Set<Item>) => void,
    addToast: AddToast,
    setItem: (item: Item) => void,
  }
) => {
  const all_columns: { [key: string]: EuiBasicTableColumn<any> } = {
    selector: {
      name: '',
      width: '2em',
      render: (item: Item) => {
        const items: Array<Item> = item.isGroup ? item.allSubItems : [item];
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
      render: (item: Item) => (
        <EuiButtonIcon
          onClick={() => toggleExpandGroup(item)}
          aria-label={expandedItems.has(item.key) ? 'Collapse' : 'Expand'}
          iconType={expandedItems.has(item.key) ? 'arrowUp' : 'arrowDown'}
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
          available: ({ outdated }: Item) => outdated,
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
          available: ({ ok }: Item) => !ok,
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
      render: (type: 'module' | 'template') => (
        <EuiIcon
          type={typeIcons[type]}
          size="l"
          title={type}
        />),
    },
    title: {
      field: 'srcFullTitle',
      name: 'Primary Page',
      sortable: true,
      render: (srcFullTitle: string, item: Item) => (
        <EuiLink href={item.srcTitleUrl} target="_blank">{srcFullTitle}</EuiLink>
      ),
    },
    lang: {
      field: 'lang',
      name: 'Lang',
      sortable: true,
    },
    project: {
      field: 'project',
      name: 'Project',
      sortable: true,
    },
    dstSite: {
      field: 'dstSite',
      name: 'Wiki',
      sortable: true,
    },
    dstTitle: {
      name: 'Wiki page',
      render: (item: Item) => (
        <EuiLink href={item.dstTitleUrl} target="_blank">{item.dstFullTitle}</EuiLink>
      ),
    },
    status: {
      field: 'status',
      name: 'Status',
      sortable: true,
      render: (status: string, item: Item) => {
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
      render: (value: number) => {
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
      render: (value: number) => {
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
      render: (value: number) => {
        if (value > 0) {
          return <EuiHealth title={'Number of pages with local modifications.'}
                            color={'danger'}>{`${value} pages`}</EuiHealth>;
        } else {
          return '-';
        }
      },
    },
  };

  const [expandedItems, setExpandedItems] = useState(new Set());

  function toggleExpandGroup(item: Item) {
    const clone = new Set(expandedItems);
    if (clone.has(item.key)) {
      clone.delete(item.key);
    } else {
      clone.add(item.key);
    }
    setExpandedItems(clone);
  }

  function createTable(groupedItems: any, isTop?: boolean) {
    const params: any = {
      items: groupedItems.items,
      columns: groupedItems.columns.map((v: string) => all_columns[v]),
      itemId: 'key',
      sorting: true,
    };
    if (isTop) {
      params.loading = props.isLoading;
      params.message = props.message;
      params.error = props.error;
    } else {
      params.className = 'sub-table';
    }
    if (!groupedItems.isLastGroup) {
      params.isExpandable = true;
      params.itemIdToExpandedRowMap = {};
      for (let item of groupedItems.items) {
        if (expandedItems.has(item.key)) {
          params.itemIdToExpandedRowMap[item.key] = createTable(item);
        }
      }
    } else {
      params.hasActions = true;
    }
    return (<EuiInMemoryTable {...params} />);
  }

  return createTable(props.groupedItems, true);
};
