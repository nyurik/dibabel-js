import React, { Dispatch, useContext, useState } from 'react';
import {
  EuiBasicTableColumn,
  EuiCheckbox,
  EuiHealth,
  EuiIcon,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiText
} from '@elastic/eui';

import { Group, Item } from '../types';
import { iconsEuiMedium, lockIcon } from '../icons/icons';
import { ExternalLink, prettyDomain } from './Snippets';
import { itemDiffLink } from '../utils';
import { CurrentItemContext } from '../contexts/CurrentItem';
import { I18nContext } from '../contexts/I18nContext';
import { SettingsContext } from '../contexts/Settings';
import { Message } from './Message';

export const ItemsTable = (
  { error, groupedItems, isLoading, message, selectedItems, setSelectedItems }: {
    isLoading: boolean,
    message: string,
    error?: string,
    groupedItems: any,
    selectedItems: Set<Item>,
    setSelectedItems: Dispatch<Set<Item>>,
  }
) => {
  const { languageNames } = useContext(SettingsContext);
  const { i18n } = useContext(I18nContext);
  const { setCurrentItem } = useContext(CurrentItemContext);

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
        return (<EuiCheckbox
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
        />);
      },
    },
    expander: {
      width: '2.5em',
      render: (item: Item) => (<EuiIcon type={expandedItems.has(item.key) ? 'arrowUp' : 'arrowDown'}/>),
    },
    protection: {
      field: 'protection',
      name: (<EuiIcon
        type={lockIcon}
        size={'m'}
        color={'#C6C7C7'}
        title={i18n('dibabel-table-icons-protection--title')}
      />),
      width: '2.2em',
      sortable: true,
      render: (rights: string) => rights ? (
        <EuiIcon
          type={lockIcon}
          size={'m'}
          color={'#0078b8'}
          title={i18n('dibabel-table-icons-protection--rights', rights)}
        />) : '',
    },
    title: {
      field: 'srcFullTitle',
      name: (<EuiText title={i18n('dibabel-table-header-primary--title')}><Message
        id="dibabel-table-header-primary--label"/></EuiText>),
      sortable: true,
      render: (_: string, item: Item) => (<>{iconsEuiMedium[item.type]}&nbsp;&nbsp;{item.srcFullTitle}<ExternalLink
        title={i18n('dibabel-table-cell-primary--title', item.srcFullTitle)}
        href={item.srcTitleUrl}/></>),
    },
    lang: {
      field: 'lang',
      name: (<EuiText title={i18n('dibabel-table-header-language--title')}><Message
        id="dibabel-table-header-language--label"/></EuiText>),
      sortable: true,
      render: (lang: string) => {
        const name = languageNames[lang];
        return name ? `${lang} - ${name}` : lang;
      },
    },
    project: {
      field: 'project',
      name: (<EuiText title={i18n('dibabel-table-header-project--title')}><Message
        id="dibabel-table-header-project--label"/></EuiText>),
      sortable: true,
      render: (_: string, item: Item) => (<>{iconsEuiMedium[item.project]}&nbsp;&nbsp;&nbsp;{item.project}</>),
    },
    wiki: {
      field: 'wiki',
      name: (<EuiText title={'The wiki site where the copied page is located.'}>Wiki site</EuiText>),
      sortable: true,
      render: (_: string, item: Item) => (<>{iconsEuiMedium[item.project]}&nbsp;&nbsp;&nbsp;{item.wiki}</>),
    },
    dstTitle: {
      field: 'dstFullTitle',
      name: (<EuiText title={i18n('dibabel-table-header-wikipage--title')}><Message
        id="dibabel-table-header-wikipage--label"/></EuiText>),
      sortable: true,
      render: (_: string, item: Item) => (<>{iconsEuiMedium[item.type]}&nbsp;&nbsp;{item.dstFullTitle}<ExternalLink
        title={i18n('dibabel-table-header-wikipage--link', prettyDomain(item.lang, item.project), item.dstFullTitle)}
        href={item.dstTitleUrl}/></>),
    },
    hash: {
      field: 'hash',
      name: (<EuiText
        title={i18n('dibabel-table-header-hash--title')}
      ><Message id="dibabel-table-header-hash--label"/></EuiText>),
      sortable: true,
      render: (hash: string) => (<EuiText
        title={i18n('dibabel-table-cell-hash--title', hash)}
      >{hash.substring(0, 7)}</EuiText>)
    },
    status: {
      field: 'sortStatus',
      name: (<EuiText
        title={i18n('dibabel-table-header-status--title')}><Message id="dibabel-table-header-status--label"/></EuiText>),
      sortable: true,
      render: (_: string, item: Item) => {
        switch (item.status) {
          case 'ok':
            return (<EuiHealth
              title={i18n('dibabel-table-cell-status--ok-title')}
              color={'success'}><Message id="dibabel-table-cell-status--ok-label"/></EuiHealth>);
          case 'unlocalized':
            return (<EuiHealth
              title={i18n('dibabel-table-cell-status--unlocalized-title')}
              color={'warning'}><Message id="dibabel-table-cell-status--unlocalized-label"/></EuiHealth>);
          case 'outdated':
            return (
              <EuiHealth
                title={i18n('dibabel-table-cell-status--outdated-title', item.behind)}
                color={'warning'}
              ><span><Message id="dibabel-table-cell-status--outdated-label" placeholders={[item.behind]}/><ExternalLink
                title={i18n('dibabel-table-cell-status--outdated-link', item.behind, item.srcFullTitle)}
                href={itemDiffLink(item)}/></span></EuiHealth>);
          case 'diverged':
            return (
              <EuiHealth
                title={'The target page has been modified and cannot be updated automatically.'}
                color={'danger'}>Diverged</EuiHealth>);
          default:
            throw new Error(i18n('dibabel-table-cell-status--error-label', item.status));
        }
      },
    },
    countOk: {
      field: 'countOk',
      name: (<EuiText title={i18n('dibabel-table-header-updated--title')}><Message
        id="dibabel-table-header-updated--label"/></EuiText>),
      sortable: true,
      render: (value: number) => {
        if (value > 0) {
          return <EuiHealth title={i18n('dibabel-table-cell-updated--title', value)}
                            color={'success'}>{i18n('dibabel-table-pagecount', value)}</EuiHealth>;
        } else {
          return '-';
        }
      },
    },
    countUnlocalized: {
      field: 'countUnlocalized',
      name: (<EuiText
        title={i18n('dibabel-table-header-unlocalized--title')}><Message
        id="dibabel-table-header-unlocalized--label"/></EuiText>),
      sortable: true,
      render: (value: number) => {
        if (value > 0) {
          return <EuiHealth
            title={i18n('dibabel-table-cell-unlocalized--title', value)}
            color={'warning'}>{i18n('dibabel-table-pagecount', value)}</EuiHealth>;
        } else {
          return '-';
        }
      },
    },
    countOutdated: {
      field: 'countOutdated',
      name: (<EuiText title={i18n('dibabel-table-header-outdated--title')}><Message
        id="dibabel-table-header-outdated--label"/></EuiText>),
      sortable: true,
      render: (value: number) => {
        if (value > 0) {
          return <EuiHealth title={i18n('dibabel-table-cell-outdated--label', value)}
                            color={'warning'}>{i18n('dibabel-table-pagecount', value)}</EuiHealth>;
        } else {
          return '-';
        }
      },
    },
    countDiverged: {
      field: 'countDiverged',
      name: (<EuiText title={i18n('dibabel-table-header-diverged--title')}><Message
        id="dibabel-table-header-diverged--label"/></EuiText>),
      sortable: true,
      render: (value: number) => {
        if (value > 0) {
          return <EuiHealth title={i18n('dibabel-table-header-diverged--title', value)}
                            color={'danger'}>{i18n('dibabel-table-pagecount', value)}</EuiHealth>;
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
      },
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
      params.rowProps = (item: Item) => ({
        onClick: (v: any) => {
          if (v.target.nodeName !== 'INPUT' && v.target.nodeName !== 'A') {
            toggleExpandGroup(item);
          }
        }
      });
    } else {
      // noinspection JSUnusedGlobalSymbols
      params.rowProps = (item: Item) => ({
        onClick: (v: any) => {
          if (v.target.nodeName !== 'INPUT' && v.target.nodeName !== 'A') {
            setCurrentItem(item);
          }
        },
      });
    }
    return (<EuiInMemoryTable {...params} />);
  }

  return createTable(groupedItems, true);
};
