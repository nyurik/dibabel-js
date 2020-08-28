import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';

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
import { Comment, ExternalLink, ItemDstLink, ItemSrcLink } from './Snippets';
import { fixMwLinks, getSummaryLink, getSummaryMsgFromStatus, itemDiffLink } from '../services/utils';
import { UserContext, UserState } from '../contexts/UserContext';
import { SettingsContext } from '../contexts/Settings';
import { Props } from '@elastic/eui/src/components/button/button';
import { icons } from '../icons/icons';
import { CurrentItemContext } from '../contexts/CurrentItem';
import { Updater } from './Updater';
import { I18nContext } from '../contexts/I18nContext';
import { Message } from './Message';
import { LineRange } from '@elastic/eui/src/components/loading/loading_content';
import { ToastsContext } from '../contexts/Toasts';
import { DependenciesList } from './DependenciesList';
import { ItemDiffBlock } from './ItemDiffBlock';

const limitEllipsis = (values: Set<string>, maxLength: number): string => {
  const text = Array.from(values).join(',');
  return text.length < maxLength ? text : (text.substring(0, maxLength) + '…');
};

const ItemDiffViewer = () => {
  const { i18nInLocale } = useContext(SettingsContext);
  const { i18n } = useContext(I18nContext);
  const { user } = useContext(UserContext);
  const { internalError } = useContext(ToastsContext);
  const { itemStatus, currentItem, itemContent, setCurrentItem } = useContext(CurrentItemContext);
  const [commentIsLoaded, setCommentIsLoaded] = useState<boolean>(false);
  const [confirmationStatus, setConfirmationStatus] = useState<boolean>(false);

  // FIXME! changes to the comment force full refresh of this component!
  // TODO: lookup how to do this better (share state with subcomponent, reference, etc)
  const [comment, setComment] = useState('');

  const item = currentItem as Item;

  useEffect(() => {
    (async () => {
      if (commentIsLoaded || !itemContent || itemStatus.status !== 'ready' || itemContent.changeType === 'ok') {
        return;
      }
      const summaryLink = getSummaryLink(item);
      const msgKey = getSummaryMsgFromStatus(itemContent.changeType);
      let newSummary;
      if (itemContent.changeType === 'outdated') {
        const users = limitEllipsis(new Set(itemContent.changes.map(v => v.user)), 80);
        const comments = limitEllipsis(new Set(itemContent.changes.map(v => v.comment)), 210);
        newSummary = await i18nInLocale(item.lang, msgKey, itemContent.changes.length, users, comments, summaryLink);
      } else {
        newSummary = await i18nInLocale(item.lang, msgKey, summaryLink);
      }
      setComment(fixMwLinks(newSummary))
      setCommentIsLoaded(true);
    })();
  }, [comment, item, i18n, itemStatus.status, itemContent, commentIsLoaded, i18nInLocale]);

  let infoSubHeader;
  switch (item.status) {
    case 'diverged':
      infoSubHeader = (<EuiHealth color={'danger'}>
        <EuiText><Message id="diff-header-description--diverged"
                          placeholders={[<ItemDstLink item={item}/>,
                            <ItemSrcLink item={item}/>]}/></EuiText></EuiHealth>);
      break;
    case 'outdated':
      infoSubHeader = (<EuiHealth color={'warning'}>
        <EuiText><Message
          id="diff-header-description--outdated"
          placeholders={[
            <ItemDstLink item={item}/>,
            <EuiLink href={itemDiffLink(item)} target={'_blank'}>{
              i18n('diff-header-description--outdated-rev', item.behind)}</EuiLink>,
            <ItemSrcLink item={item}/>
          ]}/></EuiText></EuiHealth>);
      break;
    case 'unlocalized':
      infoSubHeader = (<EuiHealth color={'warning'}>
        <EuiText><Message id="diff-header-description--unlocalized"
                          placeholders={[<ItemDstLink item={item}/>, <ItemSrcLink
                            item={item}/>]}/></EuiText></EuiHealth>);
      break;
    case 'ok':
      infoSubHeader = (<EuiHealth color={'success'}>
        <EuiText><Message id="diff-header-description--ok"
                          placeholders={[<ItemDstLink item={item}/>, <ItemSrcLink
                            item={item}/>]}/></EuiText></EuiHealth>);
      break;
    default:
      debugger;
      throw new Error(item.status);
  }

  const warnings = useMemo(() => {
    const warnings = [];
    if (item.status === 'diverged') {
      warnings.push(<EuiCallOut title={i18n('diff-header-warnings--diverged-head')} color={'warning'}
                                iconType={'alert'}>
        <EuiText>{i18n('diff-header-warnings--diverged', item.wiki)}
          <ul>
            <li key={'1'}>{i18n('diff-header-warnings--diverged-1')}</li>
            <li key={'2'}>{i18n('diff-header-warnings--diverged-2')}</li>
            <li key={'3'}>{i18n('diff-header-warnings--diverged-3')}</li>
          </ul>
        </EuiText>
      </EuiCallOut>);
      warnings.push(<EuiSpacer size={'m'}/>);
    }

    return warnings;
  }, [i18n, item]);

  const dependencies = useMemo(() => {
    return <DependenciesList links={true} item={item}/>;
  }, [item]);

  const body = useMemo(() => {
    if (!itemStatus) {
      return;
    }
    switch (itemStatus.status) {
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
          <p>{itemStatus.error}</p>
        </EuiCallOut>);
      case 'ready':
        if (!itemContent) {
          internalError('Empty content when ready. Debugging?');
          return;
        }
        switch (itemContent.changeType) {
          case 'ok':
            return (
              <ItemDiffBlock type={item.type} oldText={itemContent.currentText} newText={itemContent.currentText}/>);
          case 'new':
            return (<ItemDiffBlock type={item.type} oldText={itemContent.newText} newText={itemContent.newText}/>);
          case 'outdated':
          case 'unlocalized':
          case 'diverged':
            return (<ItemDiffBlock type={item.type} oldText={itemContent.currentText} newText={itemContent.newText}/>);
          default:
            internalError(`content.changeType ${(itemContent as any).changeType}`);
            return;
        }
      default:
        debugger;
        throw new Error(itemStatus.status);
    }
  }, [itemStatus, i18n, itemContent, item.type, internalError]);

  const onClose = useCallback(() => setCurrentItem(undefined), [setCurrentItem]);

  let footer;
  if (itemStatus.status === 'ready' && item.status !== 'ok') {
    const isLoggedIn = user.state === UserState.LoggedIn;
    const isDiverged = item.status === 'diverged';
    const btnProps: Props = {
      fill: true,
      color: (isDiverged || warnings.length > 0) ? 'danger' : 'primary',
    };
    if (isLoggedIn) {
      btnProps.onClick = () => setConfirmationStatus(true);
    } else {
      btnProps.title = i18n('diff-content--login-error');
      btnProps.disabled = true;
    }
    const externalLink = itemContent ? <ExternalLink
        href={`https://translatewiki.net/w/i.php?title=Special:Translate&showMessage=dibabel-${encodeURIComponent(getSummaryMsgFromStatus(itemContent.changeType))}&group=dibabel&language=${encodeURIComponent(item.lang)}&filter=&optional=1&action=translate`}
        icon={'globe'} color={'primary'}
        tooltip={i18n('diff-summary--tooltip')}/>
      : null;
    footer = <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent={'spaceBetween'} alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <span>{i18n('diff-summary--label')}&nbsp;{externalLink}</span>
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
          {warnings}
          {dependencies}
          {body}
        </EuiFlyoutBody>
        {footer}
      </EuiFlyout>
      {updater}
    </>
  );
};

export const ItemViewer = () => {
  const { currentItem } = useContext(CurrentItemContext);

  if (!currentItem) {
    return null;
  }
  return <ItemDiffViewer/>;
};
