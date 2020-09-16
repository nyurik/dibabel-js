import React, { useCallback, useContext, useMemo, useState } from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiLoadingContent,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { Item } from '../services/types';
import { Comment, ItemDstLink, ItemSrcLink, SummaryLabel } from './Snippets';
import { getSummaryMsgFromStatus, itemDiffLink } from '../services/utils';
import { UserContext, UserState } from '../contexts/UserContext';
import { SettingsContext } from '../contexts/Settings';
import { Props } from '@elastic/eui/src/components/button/button';
import { icons } from '../icons/icons';
import { Updater } from './Updater';
import { I18nContext } from '../contexts/I18nContext';
import { Message } from './Message';
import { LineRange } from '@elastic/eui/src/components/loading/loading_content';
import { ToastsContext } from '../contexts/Toasts';
import { DependenciesList } from './DependenciesList';
import { diffBlock } from './ItemDiffBlock';
import { AllDataContext } from '../contexts/AllData';

const ItemDiffViewer = () => {
  const { createSummaryMsg } = useContext(SettingsContext);
  const { i18n } = useContext(I18nContext);
  const { user } = useContext(UserContext);
  const { internalError } = useContext(ToastsContext);
  const { dataVersion, currentItem, setCurrentItem } = useContext(AllDataContext);

  const [commentIsLoaded, setCommentIsLoaded] = useState<boolean>(false);
  const [confirmationStatus, setConfirmationStatus] = useState<boolean>(false);

  // FIXME! changes to the comment force full refresh of this component!
  // TODO: lookup how to do this better (share state with subcomponent, reference, etc)
  const [comment, setComment] = useState('');

  const item = currentItem as Item;
  const itemContent = item?.content;
  const itemContentStatus = item?.contentStatus?.status;

  if (!commentIsLoaded && itemContent && itemContentStatus === 'ready' && itemContent.changeType === 'ok') {
    setComment(createSummaryMsg(item));
    setCommentIsLoaded(true);
  }

  const infoSubHeader = useMemo(() => {
    switch (item?.status) {
      case 'diverged':
        return (
          <EuiHealth color={'danger'}>
            <Message id="diff-header-description--diverged"
                     placeholders={[<ItemDstLink item={item}/>, <ItemSrcLink item={item}/>]}/>
          </EuiHealth>);
      case 'outdated':
        return (
          <EuiHealth color={'warning'}>
            <Message id="diff-header-description--outdated"
                     placeholders={[
                       <ItemDstLink item={item}/>,
                       <EuiLink href={itemDiffLink(item)}
                                target={'_blank'}>{i18n('diff-header-description--outdated-rev', item.behind)}</EuiLink>,
                       <ItemSrcLink item={item}/>
                     ]}/>
          </EuiHealth>);
      case 'unlocalized':
        return (
          <EuiHealth color={'warning'}>
            <Message id="diff-header-description--unlocalized"
                     placeholders={[<ItemDstLink item={item}/>, <ItemSrcLink item={item}/>]}/>
          </EuiHealth>);
      case 'ok':
        return (
          <EuiHealth color={'success'}>
            <Message id="diff-header-description--ok"
                     placeholders={[<ItemDstLink item={item}/>, <ItemSrcLink item={item}/>]}/>
          </EuiHealth>);
      default:
        throw new Error(item.status);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n, item, item?.status]);

  const header = useMemo(() => {
    const res = [];
    if (item?.status === 'diverged') {
      res.push(<EuiCallOut title={i18n('diff-header-warnings--diverged-head')} color={'warning'}
                           iconType={'alert'}>
          <EuiText>{i18n('diff-header-warnings--diverged', item.wiki)}
            <ul>
              <li key={'1'}>{i18n('diff-header-warnings--diverged-1')}</li>
              <li key={'2'}>{i18n('diff-header-warnings--diverged-2')}</li>
              <li key={'3'}>{i18n('diff-header-warnings--diverged-3')}</li>
            </ul>
          </EuiText>
        </EuiCallOut>,
        <EuiSpacer size={'m'}/>
      );
    }
    res.push(<DependenciesList links={true} item={item}/>);
    return res;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n, item, item?.status]);

  const body = useMemo(() => {
    debugger;
    if (!itemContentStatus) {
      return;
    }
    switch (itemContentStatus) {
      case 'reset':
        return undefined;
      case 'loading':
        return (<>
          <EuiProgress size={'s'} color={'accent'} label={i18n('diff-content--loading')}/>
          <EuiSpacer size={'m'}/>
          <EuiLoadingContent lines={Math.round(Math.random() * 6 + 1) as LineRange}/>
          <EuiSpacer size={'m'}/>
          <EuiLoadingContent lines={Math.round(Math.random() * 6 + 1) as LineRange}/>
          <EuiSpacer size={'m'}/>
          <EuiLoadingContent lines={Math.round(Math.random() * 6 + 1) as LineRange}/>
          <EuiSpacer size={'m'}/>
          <EuiLoadingContent lines={Math.round(Math.random() * 6 + 1) as LineRange}/>
        </>);
      case 'error':
        return (<EuiCallOut title={i18n('diff-content--loading-error')} color={'danger'} iconType={'alert'}>
          <p>{item!.contentStatus!.error}</p>
        </EuiCallOut>);
      case 'ready':
        return diffBlock(item, internalError);
      default:
        throw new Error(itemContentStatus);
    }
    // Must use   dataVersion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, item, itemContentStatus, i18n, internalError]);

  const onClose = useCallback(() => setCurrentItem(undefined), [setCurrentItem]);

  let footer;
  if (itemContentStatus === 'ready' && item.status !== 'ok') {
    const isLoggedIn = user.state === UserState.LoggedIn;
    const isDiverged = item.status === 'diverged';
    const btnProps: Props = {
      fill: true,
      color: (isDiverged) ? 'danger' : 'primary',
    };
    if (isLoggedIn) {
      btnProps.onClick = () => setConfirmationStatus(true);
    } else {
      btnProps.title = i18n('diff-content--login-error');
      btnProps.disabled = true;
    }

    footer = <EuiFlyoutFooter>
      <EuiFlexGroup gutterSize={'s'} justifyContent={'spaceBetween'} alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <SummaryLabel msgKey={itemContent && getSummaryMsgFromStatus(itemContent.changeType)}
                        lang={itemContent && item.lang}/>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <Comment readOnly={!isLoggedIn} isLoading={!commentIsLoaded} value={comment} setValue={setComment}/>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton {...btnProps} >{i18n('diff-update')}</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>;
  }

  let updater = null;
  if (confirmationStatus) {
    updater = (<Updater comment={comment} onClose={() => setConfirmationStatus(false)}/>);
  }

  return (
    <>
      <EuiFlyout
        ownFocus
        size={'l'}
        onClose={onClose}
        aria-labelledby={'flyoutTitle'}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size={'m'}>
            <EuiFlexGroup alignItems={'center'} gutterSize={'s'}>
              <EuiFlexItem grow={false}><EuiIcon type={icons[item.project]} size={'xl'}/></EuiFlexItem>&nbsp;
              <h3>{item.srcFullTitle}</h3>
            </EuiFlexGroup>
          </EuiTitle>
          <EuiSpacer size={'s'}/>
          <EuiFlexItem grow={true}>{infoSubHeader}</EuiFlexItem>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {header}
          <EuiSpacer size={'l'}/>
          {body}
        </EuiFlyoutBody>
        {footer}
      </EuiFlyout>
      {updater}
    </>
  );
};

export const ItemViewer = () => {
  const { currentItem } = useContext(AllDataContext);

  if (!currentItem) {
    return null;
  }
  return <ItemDiffViewer/>;
};
