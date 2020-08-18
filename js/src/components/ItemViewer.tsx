import React, { Dispatch, FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer';

import { ItemTypeType } from '../types';
import { ExternalLink, ItemDstLink, ItemSrcLink, ItemWikidataLink } from './Snippets';
import { itemDiffLink } from '../utils';
import { UserContext, UserState } from '../contexts/UserContext';
import { SettingsContext } from '../contexts/Settings';
import { Props } from '@elastic/eui/src/components/button/button';
import { icons } from '../icons/icons';
import { CurrentItemContext } from '../contexts/CurrentItem';
import { Updater } from './Updater';

const ItemDiffBlock = ({ type, oldText, newText }: { type: ItemTypeType, oldText: string, newText: string }) => {
  const { isDarkTheme, isSplitView } = useContext(SettingsContext);
  const isSame = oldText === newText;
  return (
    <div className={'diff-view'}>
      <ReactDiffViewer
        leftTitle={isSame ? '' : `Current ${type} content`}
        rightTitle={isSame ? '' : `New ${type} content`}
        oldValue={oldText}
        newValue={newText}
        splitView={!isSame && isSplitView}
        compareMethod={DiffMethod.WORDS}
        useDarkTheme={isDarkTheme}
        showDiffOnly={!isSame}
        hideLineNumbers={isSame}
        // Something is wrong here - somehow renderContent is called with undefined
        renderContent={str => str === undefined ? null as any : (<pre
          style={{ display: 'inline' }}
          dangerouslySetInnerHTML={{
            __html: Prism.highlight(str, type === 'module' ? Prism.languages.lua : Prism.languages.wiki),
          }}
        />)}
      />
    </div>);
};

const Comment: FunctionComponent<{ readOnly: boolean, value: string, setValue: Dispatch<string> }> = ({ readOnly, value, setValue }) => {
  return (<EuiFieldText
    readOnly={readOnly}
    placeholder={'Edit summary'}
    isInvalid={!value.trim()}
    value={value}
    onChange={e => setValue(e.target.value)}
    aria-label={'Edit summary'}
    fullWidth={true}
  />);
};

const ItemDiffViewer = () => {
  const { user } = useContext(UserContext);
  const { itemStatus, currentItem, syncData, setCurrentItem } = useContext(CurrentItemContext);
  const [confirmationStatus, setConfirmationStatus] = useState<boolean>(false);

  // FIXME! changes to the comment force full refresh of this component!
  // TODO: lookup how to do this better (share state with subcomponent, reference, etc)
  const [comment, setComment] = useState('');

  if (!currentItem) {
    throw new Error();  // not sure if this can ever happen, but play it safe
  }

  if (syncData && itemStatus.status === 'ready' && comment !== syncData.summary) {
    setComment(syncData.summary);
  }

  let infoSubHeader;
  switch (currentItem.status) {
    case 'diverged':
      infoSubHeader = (<EuiHealth color={'danger'}>
        <EuiText>The current version of{' '}<ItemDstLink item={currentItem}/>{' '}was not found in the history
          of the primary page <ItemSrcLink item={currentItem}/>.</EuiText></EuiHealth>);
      break;
    case 'outdated':
      infoSubHeader = (<EuiHealth color={'warning'}>
        <EuiText>Page{' '}<ItemDstLink item={currentItem}/>{' '}is{' '}
          <EuiLink href={itemDiffLink(currentItem)} target={'_blank'}>{currentItem.behind} revisions</EuiLink>{' '}behind
          the
          primary{' '}<ItemSrcLink item={currentItem}/>.</EuiText></EuiHealth>);
      break;
    case 'unlocalized':
      infoSubHeader = (<EuiHealth color={'warning'}>
        <EuiText>Page{' '}<ItemDstLink item={currentItem}/>{' '}is identical with the original <ItemSrcLink
          item={currentItem}/>, but needs to have some localizations.</EuiText></EuiHealth>);
      break;
    case 'ok':
      infoSubHeader = (<EuiHealth color={'success'}>
        <EuiText>Page{' '}<ItemDstLink item={currentItem}/>{' '}is a localized version of the original{' '}<ItemSrcLink
          item={currentItem}/>.</EuiText></EuiHealth>);
      break;
    default:
      throw new Error(`Unhandled ${currentItem.status}`);
  }

  function formatLinks(site: string, links: Array<string>) {
    return (<ul>
      {links.map(el => (
        <li key={el}><EuiLink href={`https://${site}/wiki/${el}`} target={'_blank'}>{el}</EuiLink></li>))}
    </ul>);
  }

  const warnings = [];
  if (currentItem.status === 'diverged') {
    warnings.push(<EuiCallOut title={'Unrecognized content'} color={'warning'} iconType={'alert'}>
      <EuiText>This page was modified by the {currentItem.wiki} community. Do not override it unless:
        <ul>
          <li>Local changes were done by mistake and should be reverted</li>
          <li>The local changes are now included in the primary page</li>
          <li>The local changes are no longer needed</li>
        </ul></EuiText>
    </EuiCallOut>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  if (currentItem.notMultisiteDeps) {
    warnings.push(<EuiCallOut title={'Dependencies are not enabled for synchronization'} color={'warning'}
                              iconType={'alert'}>
      <EuiText>This page depends on templates or modules that have not been tagged as "multi-site" in Wikidata.
        Most of the time this means that page <ItemSrcLink item={currentItem} linkToWD={false}/> is not yet ready for
        synchronization, and should not have a multi-site type in <ItemWikidataLink item={currentItem}/>. Alternatively
        it
        could also mean that the page was edited to use a new template/module, and that the new page is not enabled for
        synchronization.</EuiText>
      <EuiSpacer size={'s'}/>
      <EuiText>{formatLinks(currentItem.wiki, currentItem.notMultisiteDeps)}</EuiText>
    </EuiCallOut>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  if (currentItem.multisiteDepsNotOnDst) {
    warnings.push(<EuiCallOut title={`Dependencies do not exist in ${currentItem.wiki}`} color={'warning'}
                              iconType={'alert'}>
      <EuiText>The following dependencies are not present on the destination site. Copy these pages to
        {' '}<EuiLink href={`https://${currentItem.wiki}`} target={'_blank'}>{currentItem.wiki}</EuiLink> and make sure
        they are
        linked to other wikis.</EuiText>
      <EuiSpacer size={'s'}/>
      <EuiText>{formatLinks(currentItem.srcSite, currentItem.multisiteDepsNotOnDst)}</EuiText>
    </EuiCallOut>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  const body = useMemo(() => {
    switch (itemStatus.status) {
      case 'loading':
        return (<EuiProgress size={'s'} color={'accent'} label={'Loading page content...'}/>);
      case 'error':
        return (<EuiCallOut title={'Error loading content...'} color={'danger'} iconType={'alert'}>
          <p>{itemStatus.error}</p>
        </EuiCallOut>);
      case 'ready':
        return (<ItemDiffBlock type={currentItem.type} oldText={syncData!.currentText} newText={syncData!.newText}/>);
      default:
        throw new Error(itemStatus.status);
    }
  }, [itemStatus, currentItem.type, syncData]);

  const onClose = useCallback(() => setCurrentItem(undefined), [setCurrentItem]);

  let footer;
  if (itemStatus.status === 'ready' && currentItem.status !== 'ok') {
    const isLoggedIn = user.state === UserState.LoggedIn;
    const isDiverged = currentItem.status === 'diverged';
    const btnProps: Props = {
      fill: true,
      color: (isDiverged || warnings.length > 0) ? 'danger' : 'primary',
    };
    if (isLoggedIn) {
      btnProps.onClick = () => setConfirmationStatus(true);
    } else {
      btnProps.title = 'Please login in the upper right corner before copying.';
      btnProps.disabled = true;
    }
    footer = <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent={'spaceBetween'} alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <span>Summary&nbsp;<ExternalLink href={'https://commons.wikimedia.org/wiki/Data:I18n/DiBabel.tab'}
                                           icon={'globe'} color={'primary'}
                                           title={'Translate auto-generated summary messages.'}/></span>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <Comment readOnly={!isLoggedIn} value={comment} setValue={setComment}/>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton {...btnProps} >Update!</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>;
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
              <EuiFlexItem grow={false}><EuiIcon type={icons[currentItem.project]} size={'xl'}/></EuiFlexItem>&nbsp;
              <h3>{currentItem.srcFullTitle}</h3>
            </EuiFlexGroup>
          </EuiTitle>
          <EuiSpacer size={'s'}/>
          <EuiFlexItem grow={true}>{infoSubHeader}</EuiFlexItem>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {warnings}
          {body}
        </EuiFlyoutBody>
        {footer}
      </EuiFlyout>
      {
        confirmationStatus ? <Updater comment={comment} onClose={() => setConfirmationStatus(false)}/> : null
      }
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
