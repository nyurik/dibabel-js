import React, { DispatchWithoutAction, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import {
  EuiButton,
  EuiIcon,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiToolTip,
  EuiSpacer,
  EuiFormRow,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { I18nContext } from '../contexts/I18nContext';
import { Item } from '../services/types';
import { SelectionContext } from '../contexts/SelectionContext';
import { getAllColumns } from './ItemsTable';
import { groupBy, map } from 'lodash';
import { Message } from './Message';
import { AllDataContext } from '../contexts/AllData';
import { SettingsContext } from '../contexts/Settings';
import { DependenciesList } from './DependenciesList';
import { diffBlock } from './ItemDiffBlock';
import { ToastsContext } from '../contexts/Toasts';
import { UserContext, UserState } from '../contexts/UserContext';

type Group = {
  key: string,
  allSubItems: Item[],
  count: number,
}

export const MultiSync = ({ onClose }: { onClose: DispatchWithoutAction }) => {
  const { i18n } = useContext(I18nContext);
  const { user } = useContext(UserContext);
  const { createSummaryMsg } = useContext(SettingsContext);
  const { loadItem, editItem, dataVersion } = useContext(AllDataContext);
  const { internalError } = useContext(ToastsContext);
  const { selectedItems } = useContext(SelectionContext);
  const [expandedGroup, setExpandedGroup] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [expandedDetail, setExpandedDetail] = useState<Item | null>(null);

  const allColumns = useMemo(() => ({
    ...getAllColumns(i18n),
    count: () => ({
      field: 'count',
      name: (
        <EuiToolTip content={i18n('multisync-header-count--tooltip')}>
          <Message id="table-header-count--label"/>
        </EuiToolTip>),
      render: (value: number) => {
        return <Message id={'table-pagecount'} placeholders={[value]}/>;
      },
    }),
    expander: () => ({
      width: '2.5em',
      render: (group: Group) => (<EuiIcon type={expandedGroup === group.key ? 'arrowUp' : 'arrowDown'}/>),
    }),
    expanderDetails: () => ({
      width: '2.5em',
      render: (item: Item) => (<EuiIcon type={expandedDetail === item ? 'arrowUp' : 'arrowDown'}/>),
    }),
    complete: () => ({
      width: '2.6em',
      render: (item: Item) => {
        if (item.contentStatus) {
          switch (item.contentStatus.status) {
            case 'ready':
              return (<EuiIcon color={'success'} type={'node'}/>);
            case 'saved':
              return (<EuiIcon color={'success'} type={'checkInCircleFilled'}/>);
            case 'error':
              return (<EuiToolTip content={item.contentStatus.error}>
                <EuiIcon color={'danger'} type={'crossInACircleFilled'}/>
              </EuiToolTip>);
          }
        }
        return (<EuiLoadingSpinner size={'m'}/>);
      },
    }),
  }), [expandedDetail, expandedGroup, i18n]) as any;

  const toggleExpandGroup = useCallback((group: Group) => {
    if (group.key !== expandedGroup) {
      setExpandedGroup(group.key);
      // loadItem is async, don't wait for it
      group.allSubItems.forEach(loadItem);
    } else {
      setExpandedGroup('');
    }
    if (expandedDetail) {
      setExpandedDetail(null);
    }
    // Must use   dataVersion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, expandedDetail, expandedGroup, loadItem]);

  const toggleExpandDetail = useCallback((item: Item) => {
    if (item !== expandedDetail) {
      setExpandedDetail(item);
    } else {
      setExpandedDetail(null);
    }
  }, [expandedDetail]);

  const updateAll = useCallback(async (items: Item[]) => {
    setIsSaving(true);
    try {
      await Promise.all(items.map(async item => {
        await loadItem(item);
        if (item.contentStatus?.status === 'ready') {
          editItem(item, createSummaryMsg(item));
        }
      }));
    } catch (err) {
      internalError(err);
    } finally {
      setIsSaving(false);
    }
  }, [createSummaryMsg, editItem, internalError, loadItem]);

  const createSubSection = useCallback((item: Group) => {
    let itemIdToExpandedRowMap;
    if (expandedDetail) {
      const res: ReactNode[] = [
        (<EuiFormRow fullWidth={true}>
          <DependenciesList item={expandedDetail}/>
        </EuiFormRow>)
      ];
      if (expandedDetail?.content?.changeType) {
        res.push(<EuiFormRow fullWidth={true}>
          {diffBlock(expandedDetail, internalError)}
        </EuiFormRow>);
      }
      itemIdToExpandedRowMap = {
        [expandedDetail.key]: (<EuiForm>
          {React.Children.toArray(res)}
        </EuiForm>)
      };
    }

    const isLoggedIn = user.state === UserState.LoggedIn;

    return (<EuiForm>
      <EuiFormRow fullWidth={true}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiToolTip content={i18n(isLoggedIn ? 'multisync-button-tooltip--content' : 'diff-content--login-error')}>
              <EuiButton
                fullWidth={true}
                isDisabled={!isLoggedIn}
                isLoading={isSaving}
                fill={true}
                color={'primary'}
                onClick={() => updateAll(item.allSubItems)}>
                {i18n('sync-button--label', item.allSubItems.length)}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer size={'m'}/>
      <EuiFormRow fullWidth={true}>
        <EuiInMemoryTable
          items={item.allSubItems}
          columns={['complete', 'expanderDetails', 'wiki', 'dstTitle'].map(c => allColumns[c]())}
          itemId={'key'}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          rowProps={(item: Item) => ({
            onClick: (v: any) => {
              if (!isSaving && v.target.nodeName !== 'INPUT' && v.target.nodeName !== 'A') {
                toggleExpandDetail(item);
              }
            }
          })}
          sorting={false}
        />
      </EuiFormRow>
    </EuiForm>);

    // Must use   dataVersion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, expandedDetail, i18n, internalError, updateAll, allColumns, isSaving, toggleExpandDetail]);

  const table = useMemo(() => {
    const groupedData = groupBy(
      Array.from(selectedItems),
      (v: Item) => v.title + '/' + v.status + '/' + ('0000' + v.behind).slice(-5));
    const items = map(groupedData, (allSubItems: Item[], key: string) => {
      const itm = allSubItems[0];
      return ({
        key: key,
        type: itm.type,
        status: itm.status,
        behind: itm.behind,
        srcFullTitle: itm.srcFullTitle,
        srcTitleUrl: itm.srcTitleUrl,
        allSubItems: allSubItems,
        count: allSubItems.length,
      });
    }) as any as Array<Group>;
    items.sort((a, b) => a.key.localeCompare(b.key));

    return (<EuiInMemoryTable
      items={items}
      columns={['expander', 'title', 'status', 'count'].map(c => allColumns[c]()) as any}
      itemId={'key'}
      itemIdToExpandedRowMap={
        expandedGroup ? { [expandedGroup]: createSubSection(items.find(v => v.key === expandedGroup)!) } : undefined
      }
      rowProps={(group: Group) => ({
        onClick: (v: any) => {
          if (!isSaving && v.target.nodeName !== 'INPUT' && v.target.nodeName !== 'A') {
            toggleExpandGroup(group);
          }
        }
      })}
      sorting={false}
    />);
  }, [allColumns, createSubSection, expandedGroup, isSaving, selectedItems, toggleExpandGroup]);

  return (<EuiOverlayMask><EuiModal onClose={isSaving ? () => {} : onClose} maxWidth={false}>
    <EuiModalHeader>
      <EuiModalHeaderTitle>{i18n('multisync-page-header--label')}</EuiModalHeaderTitle>
    </EuiModalHeader>
    <EuiModalBody>
      {table}
    </EuiModalBody>
  </EuiModal></EuiOverlayMask>);
};
