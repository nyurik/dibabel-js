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
  EuiLoadingContent,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer';

import { ItemTypeType } from '../types';
import {
  ExternalLink,
  ItemDstLink,
  ItemSrcLink,
  MultisiteDepsNotOnDstWarning,
  NotMultisiteDepsWarning
} from './Snippets';
import { itemDiffLink } from '../utils';
import { UserContext, UserState } from '../contexts/UserContext';
import { SettingsContext } from '../contexts/Settings';
import { Props } from '@elastic/eui/src/components/button/button';
import { icons } from '../icons/icons';
import { CurrentItemContext } from '../contexts/CurrentItem';
import { Updater } from './Updater';
import { I18nContext } from '../contexts/I18nContext';
import { Message } from './Message';
import { LineRange } from '@elastic/eui/src/components/loading/loading_content';

const ItemDiffBlock = ({ type, oldText, newText }: { type: ItemTypeType, oldText: string, newText: string }) => {
  const { isDarkTheme, isSplitView } = useContext(SettingsContext);
  const isSame = oldText === newText;
  const { i18n } = useContext(I18nContext);
  return (
    <div className={'diff-view'}>
      <ReactDiffViewer
        leftTitle={isSame ? '' : i18n('dibabel-diff-title--current', type)}
        rightTitle={isSame ? '' : i18n('dibabel-diff-title--new', type)}
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
  const { i18n } = useContext(I18nContext);
  return (<EuiFieldText
    readOnly={readOnly}
    placeholder={i18n('dibabel-diff-summary--placeholder')}
    isInvalid={!value.trim()}
    value={value}
    onChange={e => setValue(e.target.value)}
    aria-label={i18n('dibabel-diff-summary--placeholder')}
    fullWidth={true}
  />);
};

const ItemDiffViewer = () => {
  const { i18n } = useContext(I18nContext);
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
        <EuiText><Message id="dibabel-diff-header-description--diverged"
                          placeholders={[<ItemDstLink item={currentItem}/>,
                            <ItemSrcLink item={currentItem}/>]}/></EuiText></EuiHealth>);
      break;
    case 'outdated':
      infoSubHeader = (<EuiHealth color={'warning'}>
        <EuiText><Message id="dibabel-diff-header-description--outdated"
                          placeholders={[<ItemDstLink item={currentItem}/>, <EuiLink href={itemDiffLink(currentItem)}
                                                                                     target={'_blank'}>{i18n('dibabel-diff-header-description--outdated-rev', currentItem.behind)}</EuiLink>,
                            <ItemSrcLink item={currentItem}/>]}/></EuiText></EuiHealth>);
      break;
    case 'unlocalized':
      infoSubHeader = (<EuiHealth color={'warning'}>
        <EuiText><Message id="dibabel-diff-header-description--unlocalized"
                          placeholders={[<ItemDstLink item={currentItem}/>, <ItemSrcLink
                            item={currentItem}/>]}/></EuiText></EuiHealth>);
      break;
    case 'ok':
      infoSubHeader = (<EuiHealth color={'success'}>
        <EuiText><Message id="dibabel-diff-header-description--ok"
                          placeholders={[<ItemDstLink item={currentItem}/>, <ItemSrcLink
                            item={currentItem}/>]}/></EuiText></EuiHealth>);
      break;
    default:
      throw new Error(i18n('dibabel-diff-header-description--error', currentItem.status));
  }

  const warnings = [];
  if (currentItem.status === 'diverged') {
    warnings.push(<EuiCallOut title={i18n('dibabel-diff-header-warnings--diverged-head')} color={'warning'}
                              iconType={'alert'}>
      <EuiText>{i18n('dibabel-diff-header-warnings--diverged', currentItem.wiki)}
        <ul>
          <li>{i18n('dibabel-diff-header-warnings--diverged-1')}</li>
          <li>{i18n('dibabel-diff-header-warnings--diverged-2')}</li>
          <li>{i18n('dibabel-diff-header-warnings--diverged-3')}</li>
        </ul>
      </EuiText>
    </EuiCallOut>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  if (currentItem.notMultisiteDeps) {
    warnings.push(<NotMultisiteDepsWarning item={currentItem}/>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  if (currentItem.multisiteDepsNotOnDst) {
    warnings.push(<MultisiteDepsNotOnDstWarning item={currentItem}/>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  const body = useMemo(() => {
    switch (itemStatus.status) {
      case 'reset':
        return undefined;
      case 'loading':
        return (<>
          <EuiProgress size={'s'} color={'accent'} label={i18n('dibabel-diff-content--loading')}/>
          <EuiSpacer size={'m'}/>
          <EuiLoadingContent lines={Math.round(Math.random()*6+1) as LineRange}/>
          <EuiSpacer size={'m'}/>
          <EuiLoadingContent lines={Math.round(Math.random()*6+1) as LineRange}/>
          <EuiSpacer size={'m'}/>
          <EuiLoadingContent lines={Math.round(Math.random()*6+1) as LineRange}/>
          <EuiSpacer size={'m'}/>
          <EuiLoadingContent lines={Math.round(Math.random()*6+1) as LineRange}/>
        </>);
      case 'error':
        return (<EuiCallOut title={i18n('dibabel-diff-content--loading-error')} color={'danger'} iconType={'alert'}>
          <p>{itemStatus.error}</p>
        </EuiCallOut>);
      case 'ready':
        return (<ItemDiffBlock type={currentItem.type} oldText={syncData!.currentText} newText={syncData!.newText}/>);
      default:
        throw new Error(itemStatus.status);
    }
  }, [itemStatus.status, itemStatus.error, i18n, currentItem.type, syncData]);

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
      btnProps.title = i18n('dibabel-diff-content--login-error');
      btnProps.disabled = true;
    }
    footer = <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent={'spaceBetween'} alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <span>{i18n('dibabel-diff-content--login-error')}&nbsp;<ExternalLink
            href={'https://commons.wikimedia.org/wiki/Data:I18n/DiBabel.tab'}
            icon={'globe'} color={'primary'}
            title={'Translate auto-generated summary messages.'}/></span>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <Comment readOnly={!isLoggedIn} value={comment} setValue={setComment}/>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton {...btnProps} >{i18n('dibabel-diff-update')}</EuiButton>
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
