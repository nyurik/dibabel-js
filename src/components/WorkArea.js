import React, { useState } from 'react';
import * as U from '@elastic/eui';
import { getItems } from '../data/Store';
import groupBy from 'lodash/groupBy';
import countBy from 'lodash/countBy';
import map from 'lodash/map';

export const WorkArea = () => {
  const [groupByItems, setGroupByItems] = useState('source');  // could also be '' and 'source+behind'
  const [items, setItems] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState();
  const [error, setError] = useState();
  const [selection, setSelection] = useState([]);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState({});

  const all_columns = {
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
      width: '40px',
      isExpander: true,
      render: item => (
        <U.EuiButtonIcon
          onClick={() => toggleDetails(item)}
          aria-label={itemIdToExpandedRowMap[item.key] ? 'Collapse' : 'Expand'}
          iconType={itemIdToExpandedRowMap[item.key] ? 'arrowUp' : 'arrowDown'}
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
        <U.EuiIcon
          type={type === 'module'
            ? 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Lua-Logo.svg'
            : 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Template_icon.svg'}
          size="l"
          title={type}
        />),
    },
    srcTitle: {
      name: 'Source Page',
      sortable: (a, b, c) => {
        console.log('----------', a, b, c);
        return true;
      },
      render: item => (
        <U.EuiLink href={item.srcTitleUrl} target="_blank">{item.srcFullTitle}</U.EuiLink>
      ),
    },
    dstSite: {
      field: 'dstSite',
      name: 'Site',
      sortable: true,
    },
    dstTitle: {
      name: 'Page',
      sortable: (a, b, c) => {
        console.log('----------', a, b, c);
        return true;
      },
      render: item => (
        <U.EuiLink href={item.dstTitleUrl} target="_blank">{item.dstFullTitle}</U.EuiLink>
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
        return <U.EuiHealth title={title} color={color}>{label}</U.EuiHealth>;
      },
    },
    groupInSync: {
      name: 'In Sync',
      description: 'Number of up to date pages.',
      render: item => {
        if (item.groupInSync > 0) {
          return <U.EuiHealth title={'Number of up to date pages.'}
                              color={'success'}>{`${item.groupInSync} pages`}</U.EuiHealth>;
        }
      },
      sortable: (a, b, c) => {
        console.log('----------', a, b, c);
        return true;
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
          label = item.groupBehind.map(v => `by ${v.behind}\u00A0x${v.count}`).join(', ');
          title = 'Number of revisions fallen behind, with (page count)';
        }
        return <U.EuiHealth title={title} color={'warning'}>{label}</U.EuiHealth>;
      },
      sortable: (a, b, c) => {
        console.log('----------', a, b, c);
        return true;
      },
    },
    groupDiverged: {
      name: 'Diverged',
      description: 'Number of pages with local modifications.',
      render: item => {
        if (item.groupDiverged > 0) {
          return <U.EuiHealth title={'Number of pages with local modifications.'}
                              color={'danger'}>{`${item.groupDiverged} pages`}</U.EuiHealth>;
        }
      },
      sortable: (a, b, c) => {
        console.log('----------', a, b, c);
        return true;
      },
    },
  };

  function toggleDetails(item) {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.key]) {
      delete itemIdToExpandedRowMapValues[item.key];
    } else {
      itemIdToExpandedRowMapValues[item.key] = (<U.EuiInMemoryTable
        className={"sub-table"}
        items={item.items}
        columns={item.itemsColumns.map(v => all_columns[v])}
        itemId="site"
        sorting={true}
        selection={selectionValue}
        isSelectable={true}
      />);
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  }

  async function loadItems() {
    setIsLoading(true);
    setItems([]);
    setMessage('Loading ...');
    setError();

    try {
      // TODO: REMOVE SLEEP!
      await new Promise(r => setTimeout(r, 100));
      setItems(await getItems());
    } catch (err) {
      setError(`Unable to load data. ${err}`);
    }

    setIsLoading(false);
    setMessage();
  }

  const renderToolsLeft = () => {
    if (selection.length === 0) {
      return;
    }

    const onClick = async () => {
      // store.deleteUsers(...selection.map(user => user.id));
      setSelection([]);
    };

    return (
      <U.EuiButton color="danger" iconType="trash" onClick={onClick}>
        Sync {selection.length} items
      </U.EuiButton>
    );
  };

  const renderToolsRight = () => {
    if (isLoading) {
      return <U.EuiButton key="loadItems" isDisabled={true} isLoading={true}>
        Refreshing...
      </U.EuiButton>;
    } else {
      return <U.EuiButton key="loadItems" iconType="refresh" onClick={loadItems}>
        Refresh
      </U.EuiButton>;
    }
  };

  const search = {
    toolsLeft: renderToolsLeft(),
    toolsRight: renderToolsRight(),
    box: { incremental: true },
  };

  const selectionValue = {
    selectable: ({ isInSync, diverged }) => isInSync === false && !diverged,
    selectableMessage: selectable => !selectable ? 'Cannot be selected' : undefined,
    onSelectionChange: selection => setSelection(selection),
    initialSelected: [],
  };

  if (items === undefined && !isLoading) {
    // Initiate item loading, while showing an empty table
    // FIXME? should we handle returned promise?
    // FIXME? should this be initiated in a constructor or some other way?
    loadItems();
  }

  let columns, groupedItems;
  let allItems = items || [];
  switch (groupByItems) {
    case 'source':
      columns = ['expander', 'type', 'srcTitle', 'groupInSync', 'groupBehind', 'groupDiverged'];
      let groups = groupBy(allItems, v => v.srcTitleUrl);
      groupedItems = map(groups, vals => {
        const first = vals[0];
        let behind = countBy(vals.map(v => v.behind).filter(v => v !== undefined));
        let inSync = 0;
        if (behind.hasOwnProperty('0')) {
          inSync = behind['0'];
          delete behind['0'];
        }
        behind = map(behind, (v, k) => ({ behind: parseInt(k), count: v }));
        behind.sort(v => v.behind);
        let diverged = vals.map(v => v.diverged).filter(v => v !== undefined).length;
        return {
          key: first.srcTitleUrl,
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
          itemsColumns: ['actions', 'dstSite', 'dstTitle', 'behind'],
        };
      });
      break;
    case 'source+behind':
      columns = ['actions', 'expander', 'type', 'srcTitle', 'dstSite', 'dstTitle', 'groupDiverged', 'groupBehind', 'groupInSync'];
      groupedItems = allItems;
      break;
    case '':
      columns = ['actions', 'type', 'srcTitle', 'dstSite', 'dstTitle', 'behind'];
      groupedItems = allItems;
      break;
    default:
      throw new Error(`Unknown type ${groupByItems}`);
  }

  return (<U.EuiInMemoryTable
    items={groupedItems}
    loading={isLoading}
    columns={columns.map(v => all_columns[v])}
    search={search}
    itemId={'key'}
    sorting={true}
    message={message}
    error={error}
    selection={selectionValue}
    isSelectable={true}
    itemIdToExpandedRowMap={itemIdToExpandedRowMap}
    isExpandable={true}
    hasActions={true}
  />);
};
