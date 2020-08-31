import React, { FunctionComponent, useContext, useState } from 'react';
import { AddNewClone, isSyncCopy, Item } from '../services/types';
import { I18nContext } from '../contexts/I18nContext';
import { AllDataContext } from '../contexts/AllData';
import { CurrentItemContext } from '../contexts/CurrentItem';
import { Message } from './Message';
import { wikiUrl } from '../services/utils';
import { ExternalLink } from './Snippets';

import { EuiBasicTableColumn, EuiButtonEmpty, EuiCallOut, EuiHealth, EuiInMemoryTable, EuiSpacer, } from '@elastic/eui';
import { AddNew } from './AddNew';

type DepItem = { title: string, href: string, color: string, status: string, sort: string, clone?: Item | AddNewClone };

export const DependenciesList: FunctionComponent<{ item: Item, links?: boolean }> = ({ item, links }) => {
  const { i18n } = useContext(I18nContext);
  const { allItems } = useContext(AllDataContext);
  const { setCurrentItem } = useContext(CurrentItemContext);
  const [addLang, setAddLang] = useState<AddNewClone | null>(null);

  if (item.srvPage.allPrimaryDependencies.size === 0 && item.srvPage.allLocalDependencies.size === 0) {
    return (<EuiCallOut title={i18n('diff-deps-none--label')} color={'success'}/>);
  }

  const result = [];
  let depItems: DepItem[] = [];

  if (item.sortDepsStatus > 0) {
    result.push(
      <EuiCallOut title={i18n('diff-deps-warning--title')}
                  color={'warning'} iconType={'alert'}>
        <Message id={'diff-deps-warnings--content'}/>
      </EuiCallOut>,
      <EuiSpacer size={'m'}/>
    );
  }

  item.srvPage.allPrimaryDependencies.forEach((value) => {
    depItems.push({
      title: value.primaryTitle,
      href: value.type === 'no_wd' ? wikiUrl(value.primarySite, value.primaryTitle) : '',
      status: value.type === 'no_wd' ? i18n('diff-deps-status--no-wd') : i18n('diff-deps-status--missing', value.primarySite),
      color: 'danger',
      sort: `${value.type === 'no_wd' ? 1 : 0}/${value.primaryTitle}`,
    });
  });

  item.srvPage.allLocalDependencies.forEach((value) => {
    const copy = value.copiesLookup.get(item.wiki);
    if (!copy) {
      depItems.push({
        title: value.primaryTitle,
        href: wikiUrl(value.primarySite, value.primaryTitle),
        status: i18n('diff-deps-status--no-copy', item.wiki),
        color: 'danger',
        sort: `2/${value.primaryTitle}`,
        clone: {
          status: 'create',
          titleNoNs: value.primaryTitle,
          wiki: item.wiki,
        },
      });
    } else if (!isSyncCopy(copy)) {
      depItems.push({
        title: copy.title,
        href: wikiUrl(copy.domain, copy.title),
        status: i18n(value.type === 'manual_sync' ? 'diff-deps-status--manual-sync' : 'diff-deps-status--no-sync'),
        color: 'warning',
        sort: `${value.type === 'manual_sync' ? 4 : 3}/${copy.title}`,
      });
    } else {
      depItems.push({
        title: copy.title,
        href: wikiUrl(copy.domain, copy.title),
        status: i18n(`table-cell-status--${copy.status}-label`, copy.behind),
        color: copy.status === 'ok' ? 'success' : (copy.status === 'diverged' ? 'danger' : 'warning'),
        sort: `${copy.status === 'ok' ? 9 : (copy.status === 'diverged' ? 5 : 6)}/${copy.title}`,
        clone: allItems.filter(v => v.wiki === copy.domain && v.dstFullTitle === copy.title)[0],
      });
    }
  });

  depItems.sort((a, b) => a.sort.localeCompare(b.sort));

  const columns: EuiBasicTableColumn<DepItem>[] = [
    {
      field: 'title',
      name: (<Message id="diff-deps-header--title"/>),
      sortable: true,
      render: (_: string, dep: DepItem) => (<>{dep.title}{dep.href ? <ExternalLink
        href={dep.href}
        title={dep.title}
        tooltip={''}
      /> : ''}</>),
    },
    {
      field: 'status',
      name: (<Message id="diff-deps-header--status"/>),
      sortable: true,
      render: (value: string, dep: DepItem) => (<EuiHealth color={dep.color}>{value}</EuiHealth>),
    },
  ];

  if (links) {
    columns.push({
      field: 'clone',
      name: '',
      render: (clone: Item | AddNewClone) => {
        if (clone) {
          if (clone.status === 'create') {
            return <EuiButtonEmpty onClick={() => setAddLang(clone)}>
              <Message id={'diff-deps-button-new--caption'}/>
            </EuiButtonEmpty>;
          } else {
            return <EuiButtonEmpty onClick={() => setCurrentItem(clone)}>
              <Message id={'diff-deps-button--caption'}/>
            </EuiButtonEmpty>;
          }
        }
        return <></>;
      }
    });
  }

  if (addLang) {
    result.push(<AddNew onClose={() => setAddLang(null)} initWith={addLang}/>);
  }

  result.push(<EuiInMemoryTable
    items={depItems}
    columns={columns}
    itemId={'href'}
    sorting={true}
    pagination={false}
  />);

  return (<>{React.Children.toArray(result)}</>);
};
