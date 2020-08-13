import React, { Dispatch, useState } from 'react';

import {
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiCheckbox,
  EuiHealth,
  EuiIcon,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiText
} from '@elastic/eui';

import { Group, Item, ItemTypeType } from '../data/types';
import { lockIcon, typeIcons } from '../icons/icons';
import { ItemDiffLink, ItemDstLink, ItemSrcLink, ProjectIcon } from './Snippets';
// import { ToastsContext } from './Toasts';

export const ItemsTable = (
  { error, groupedItems, isLoading, message, selectedItems, setItem, setSelectedItems }: {
    isLoading: boolean,
    message: string,
    error: string,
    groupedItems: any,
    selectedItems: Set<Item>,
    setSelectedItems: Dispatch<Set<Item>>,
    setItem: Dispatch<Item>,
  }
) => {
  // const addToast = useContext(ToastsContext);

  const all_columns: { [key: string]: EuiBasicTableColumn<Item> } = {
    selector: {
      name: '',
      width: '2em',
      render: (item: Group | Item) => {
        // @ts-ignore
        const items: Array<Item> = item.allSubItems ?? [item];
        const selectable = items.filter(v => v.behind && v.behind > 0);
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
      name: 'Action',
      width: '4em',
      actions: [
        // {
        //   name: 'Copy',
        //   description: 'Update code from primary source',
        //   icon: 'save',
        //   type: 'icon',
        //   color: 'danger',
        //   available: ({ status }) => status === 'outdated' || status === 'unlocalized',
        //   onClick: () => addToast({
        //     title: 'Copying...',
        //     color: 'danger',
        //     iconType: 'alert',
        //   }),
        // },
        {
          name: 'Diff',
          description: 'Compare with the primary',
          icon: 'magnifyWithPlus',
          type: 'icon',
          available: ({ status }) => status !== 'ok',
          onClick: setItem,
        },
        // {
        //   render: (item: Item) => item.status !== 'ok' ?
        //     (<EuiIcon
        //       title={'Compare with the primary'}
        //       type={diffIcon}
        //       size={'m'}
        //       color={'#0078b8'}
        //       onClick={() => setItem(item)}/>)
        //     : (<></>),
        // },
      ],
    },
    type: {
      field: 'type',
      name: (<EuiText title={'Type of the page (template or module)'}>Type</EuiText>),
      width: '3.8em',
      sortable: true,
      mobileOptions: { show: false },
      render: (type: ItemTypeType) => (
        <EuiIcon
          type={typeIcons[type]}
          size={'m'}
          title={type}
        />),
    },
    protection: {
      field: 'protection',
      name: (<EuiIcon
        type={lockIcon}
        size={'m'}
        color={'#C6C7C7'}
        title={`Indicate if special rights are required to edit.`}
      />),
      width: '3.8em',
      sortable: true,
      render: (rights: string) => rights ? (
        <EuiIcon
          type={lockIcon}
          size={'m'}
          color={'#0078b8'}
          title={`Rights required to edit: ${rights}`}
        />) : '',
    },
    title: {
      field: 'srcFullTitle',
      name: (<EuiText title={'Title of the page at mediawiki.org'}>Primary Page</EuiText>),
      sortable: true,
      render: (_: string, item: Item) => (<ItemSrcLink item={item}/>),
    },
    lang: {
      field: 'lang',
      name: (<EuiText title={'The language of the wiki'}>Language</EuiText>),
      sortable: true,
    },
    project: {
      field: 'project',
      name: (<EuiText title={'Wiki project, e.g. wikipedia, wikibooks, ...'}>Project</EuiText>),
      sortable: true,
      render: (_: string, item: Item) => (<><ProjectIcon item={item}/>&nbsp;&nbsp;&nbsp;{item.project}</>),
    },
    dstSite: {
      field: 'dstSite',
      name: (<EuiText title={'The wiki site where the copied page is located.'}>Wiki site</EuiText>),
      sortable: true,
      render: (_: string, item: Item) => (<><ProjectIcon item={item}/>&nbsp;&nbsp;&nbsp;{item.dstSite}</>),
    },
    dstTitle: {
      field: 'dstFullTitle',
      name: (<EuiText title={'Title of the copied page as it appears on the destination wiki.'}>Wiki page</EuiText>),
      sortable: true,
      render: (_: string, item: Item) => (<ItemDstLink item={item}/>),
    },
    status: {
      field: 'status',
      name: (<EuiText
        title={'Show if the copied page is in sync with the original, has fallen behind, or has been modified locally (diverged).'}>Status</EuiText>),
      sortable: true,
      render: (status: string, item: Item) => {
        let color, label, title;
        switch (status) {
          case 'ok':
            [color, label, title] = ['success', 'Same', 'The target page is up to date with the primary'];
            break;
          case 'unlocalized':
            [color, label, title] = ['warning', `Unlocalized`, `The target page has exactly the same content as original instead of using localized values, and needs to be updated.`];
            break;
          case 'outdated':
            color = 'warning';
            label = (<ItemDiffLink item={item}>{`Outdated by ${item.behind} rev`}</ItemDiffLink>);
            title = `The target page is outdated by ${item.behind} versions, and can be updated.  Click to see changes.`;
            break;
          case 'diverged':
            [color, label, title] = ['danger', 'Diverged', 'The target page has been modified and cannot be updated automatically.'];
            break;
          default:
            throw new Error(`Unknown status ${status}`);
        }
        return <EuiHealth title={title} color={color}>{label}</EuiHealth>;
      },
    },
    countOk: {
      field: 'countOk',
      name: (<EuiText title={'Number of up to date pages.'}>Same</EuiText>),
      sortable: true,
      render: (value: number) => {
        if (value > 0) {
          return <EuiHealth title={`${value} pages are up to date.`}
                            color={'success'}>{`${value} pages`}</EuiHealth>;
        } else {
          return '-';
        }
      },
    },
    countUnlocalized: {
      field: 'countUnlocalized',
      name: (<EuiText
        title={'Number of pages that are identical to the original. These pages need to be localized (e.g. rename dependent templates)'}>Unlocalized</EuiText>),
      sortable: true,
      render: (value: number) => {
        if (value > 0) {
          return <EuiHealth
            title={`${value} pages are identical to the original. These pages need to be localized because some dependent templates may have different names on that wiki. This can be done automatically.`}
            color={'warning'}>{`${value} pages`}</EuiHealth>;
        } else {
          return '-';
        }
      },
    },
    countOutdated: {
      field: 'countOutdated',
      name: (<EuiText title={'Number of pages that has fallen behind with the primary.'}>Outdated</EuiText>),
      sortable: true,
      render: (value: number) => {
        if (value > 0) {
          return <EuiHealth title={`${value} pages are behind the primary and can be synchronized automatically.`}
                            color={'warning'}>{`${value} pages`}</EuiHealth>;
        } else {
          return '-';
        }
      },
    },
    countDiverged: {
      field: 'countDiverged',
      name: (<EuiText title={'Number of pages with local modifications.'}>Diverged</EuiText>),
      sortable: true,
      render: (value: number) => {
        if (value > 0) {
          return <EuiHealth title={`${value} pages have local modifications and must be synchronized individually.`}
                            color={'danger'}>{`${value} pages`}</EuiHealth>;
        } else {
          return '-';
        }
      },
    },
  };

  const [expandedItems, setExpandedItems] = useState(() => new Set());

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
    const params: EuiInMemoryTableProps<Item> = {
      items: groupedItems.items,
      columns: groupedItems.columns.map((v: string) => all_columns[v]),
      itemId: 'key',
      sorting: true,
      pagination: {
        initialPageSize: 15,
        hidePerPageOptions: true,
      }
    };
    if (isTop) {
      params.loading = isLoading;
      params.message = message;
      params.error = error;
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
      // params.onClick = (item: any) => setItem(item.target);
    }
    return (<EuiInMemoryTable {...params} />);
  }

  return createTable(groupedItems, true);
};
