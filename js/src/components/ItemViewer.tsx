import React, { Dispatch, FunctionComponent, useContext, useEffect, useMemo, useState } from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiConfirmModal,
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
  EuiOverlayMask,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer';

import { Item, ItemTypeType, SyncContentType, UpdateItems } from '../data/types';
import { ExternalLink, ItemDstLink, ItemSrcLink, ItemWikidataLink } from './Snippets';
import { getToken, itemDiffLink, postToApi, rootUrl, sleep } from '../utils';
import { UserContext, UserState } from '../data/UserContext';
import { ToastsContext } from './Toasts';
import { Props } from '@elastic/eui/src/components/button/button';
import { icons } from '../icons/icons';
import { SettingsContext } from './Settings';

interface ItemViewerParams<TItem> {
  item: TItem;
  updateItem: UpdateItems;
  onClose: (
    event?:
      | React.KeyboardEvent<HTMLDivElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => void
}

const updateItemIfChanged = (item: Item, data: SyncContentType, updateItem: UpdateItems): boolean => {
  if (item.dstTimestamp !== data.syncInfo.timestamp) {
    updateItem(item.key, data.syncInfo);
    return true;
  }
  return false;
};

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

type ContentType = {
  status: 'loading' | 'error' | 'ok' | 'saved',
  error?: string,
  data?: SyncContentType
};

const getPageData = async (item: Item): Promise<ContentType> => {
  try {
    const result = await fetch(`${rootUrl}page/${item.qid}/${item.wiki}`);
    if (result.ok) {
      let data: SyncContentType = await result.json();
      return { status: 'ok', data };
    } else {
      return {
        status: 'error',
        error: `Unable to get the page. ${result.status}: ${result.statusText}\n${await result.text()}`
      };
    }
  } catch (err) {
    return { status: 'error', error: err.toString() };
  }
};

const ItemDiffViewer = ({ onClose, updateItem, item }: ItemViewerParams<Item>) => {

  const addToast = useContext(ToastsContext);
  const { user } = useContext(UserContext);
  const [content, setContent] = useState<ContentType>({ status: 'loading' });
  const [confirmationStatus, setConfirmationStatus] = useState<'hide' | 'show' | 'saving'>('hide');

  // FIXME! changes to the comment force full refresh of this component!
  // TODO: lookup how to do this better (share state with subcomponent, reference, etc)
  const [comment, setComment] = useState('');

  useEffect(() => {
    // noinspection JSIgnoredPromiseFromCall
    getPageData(item).then(v => {
      setContent(v);
      if (v.status === 'ok') {
        setComment(v.data!.summary || '');
      }
    });
  }, [item, updateItem]);

  let infoSubHeader;
  switch (item.status) {
    case 'diverged':
      infoSubHeader = (<EuiHealth color={'danger'}>
        <EuiText>The current version of{' '}<ItemDstLink item={item}/>{' '}was not found in the history
          of the primary page <ItemSrcLink item={item}/>.</EuiText></EuiHealth>);
      break;
    case 'outdated':
      infoSubHeader = (<EuiHealth color={'warning'}>
        <EuiText>Page{' '}<ItemDstLink item={item}/>{' '}is{' '}
          <EuiLink href={itemDiffLink(item)} target={'_blank'}>{item.behind} revisions</EuiLink>{' '}behind the
          primary{' '}<ItemSrcLink item={item}/>.</EuiText></EuiHealth>);
      break;
    case 'unlocalized':
      infoSubHeader = (<EuiHealth color={'warning'}>
        <EuiText>Page{' '}<ItemDstLink item={item}/>{' '}is identical with the original <ItemSrcLink
          item={item}/>, but needs to have some localizations.</EuiText></EuiHealth>);
      break;
    case 'ok':
      infoSubHeader = (<EuiHealth color={'success'}>
        <EuiText>Page{' '}<ItemDstLink item={item}/>{' '}is a localized version of the original{' '}<ItemSrcLink
          item={item}/>.</EuiText></EuiHealth>);
      break;
    default:
      throw new Error(`Unhandled ${item.status}`);
  }

  function formatLinks(site: string, links: Array<string>) {
    return (<ul>
      {links.map(el => (<li><EuiLink href={`https://${site}/wiki/${el}`} target={'_blank'}>{el}</EuiLink></li>))}
    </ul>);
  }

  const warnings = [];
  if (item.status === 'diverged') {
    warnings.push(<EuiCallOut title={'Unrecognized content'} color={'warning'} iconType={'alert'}>
      <EuiText>This page was modified by the {item.wiki} community. Do not override it unless:
        <ul>
          <li>Local changes were done by mistake and should be reverted</li>
          <li>The local changes are now included in the primary page</li>
          <li>The local changes are no longer needed</li>
        </ul></EuiText>
    </EuiCallOut>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  if (item.notMultisiteDeps) {
    warnings.push(<EuiCallOut title={'Dependencies are not enabled for synchronization'} color={'warning'}
                              iconType={'alert'}>
      <EuiText>This page depends on templates or modules that have not been tagged as "multi-site" in Wikidata.
        Most of the time this means that page <ItemSrcLink item={item} linkToWD={false}/> is not yet ready for
        synchronization, and should not have a multi-site type in <ItemWikidataLink item={item}/>. Alternatively it
        could also mean that the page was edited to use a new template/module, and that the new page is not enabled for
        synchronization.</EuiText>
      <EuiSpacer size={'s'}/>
      <EuiText>{formatLinks(item.wiki, item.notMultisiteDeps)}</EuiText>
    </EuiCallOut>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  if (item.multisiteDepsNotOnDst) {
    warnings.push(<EuiCallOut title={`Dependencies do not exist in ${item.wiki}`} color={'warning'}
                              iconType={'alert'}>
      <EuiText>The following dependencies are not present on the destination site. Copy these pages to
        {' '}<EuiLink href={`https://${item.wiki}`} target={'_blank'}>{item.wiki}</EuiLink> and make sure they are
        linked to other wikis.</EuiText>
      <EuiSpacer size={'s'}/>
      <EuiText>{formatLinks(item.srcSite, item.multisiteDepsNotOnDst)}</EuiText>
    </EuiCallOut>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  const body = useMemo(() => {
    switch (content.status) {
      case 'loading':
        return (<EuiProgress size={'s'} color={'accent'} label={'Loading page content...'}/>);
      case 'error':
        return (<EuiCallOut title={'Error loading content...'} color={'danger'} iconType={'alert'}>
          <p>{content.data}</p>
        </EuiCallOut>);
      case 'ok':
        return (<ItemDiffBlock type={item.type} oldText={content.data!.currentText} newText={content.data!.newText}/>);
      default:
        throw new Error(content.status);
    }
  }, [content.data, content.status, item.type]);

  const onCopy = async () => {
    try {
      setConfirmationStatus('saving');
      let res = await postToApi(item.wiki, {
        action: 'edit',
        title: item.dstFullTitle,
        text: content.data!.newText,
        summary: comment,
        basetimestamp: content.data!.syncInfo.timestamp,
        nocreate: '1',
        token: await getToken(item.wiki),
      });
      if (res.edit.result !== 'Success') {
        setContent({ status: 'error', data: res.edit.info || JSON.stringify(res.edit) });
        return;
      }
      onClose();
      addToast({
        title: (<EuiText><ItemDstLink item={item}/>{' '}was updated</EuiText>),
        iconType: 'check',
        color: 'success',
      });

      let tries = 0;
      const maxTries = 30;
      for (; tries < maxTries; tries++) {
        const res = await getPageData(item);
        if (res.status !== 'ok' || updateItemIfChanged(item, res.data!, updateItem)) {
          break;
        }
        // Sleep, but no longer than 10 seconds each time
        await sleep(1000 * Math.min(10, tries));
      }
      if (tries === maxTries) {
        addToast({
          title: (
            <EuiText><ItemDstLink item={item}/>{' '}was updated, but the DiBabel server was not able to get updated
              information.</EuiText>),
          color: 'danger',
          iconType: 'alert',
        });
      }

    } catch (err) {
      addToast({
        title: (<EuiText>Error saving{' '}<ItemDstLink item={item}/>{' '}- {err.toString()}</EuiText>),
        color: 'danger',
        iconType: 'alert',
      });
    } finally {
      setConfirmationStatus('hide');
    }
  };

  let confirmDialog;
  if (confirmationStatus !== 'hide') {
    confirmDialog = (<EuiOverlayMask><EuiConfirmModal
      title="Updating wiki page"
      onCancel={() => setConfirmationStatus('hide')}
      onConfirm={onCopy}
      cancelButtonText="No, take me back"
      confirmButtonText="Yes, do it!"
      buttonColor="primary"
      defaultFocusedButton="confirm"
      confirmButtonDisabled={confirmationStatus !== 'show'}
    >
      <p>You&rsquo;re about to edit <ItemDstLink item={item}/></p>
      <p>Are you sure you want to do this?</p>
    </EuiConfirmModal></EuiOverlayMask>);
  }

  let footer;
  if (content.status === 'ok' && item.status !== 'ok') {
    const isLoggedIn = user.state === UserState.LoggedIn;
    const isDiverged = item.status === 'diverged';
    const btnProps: Props = {
      fill: true,
      color: (isDiverged || warnings.length > 0) ? 'danger' : 'primary',
    };
    if (isLoggedIn) {
      btnProps.onClick = () => setConfirmationStatus('show');
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
              <EuiFlexItem grow={false}><EuiIcon type={icons[item.project]} size={'xl'}/></EuiFlexItem>&nbsp;
              <h3>{item.srcFullTitle}</h3>
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
      {confirmDialog}
    </>
  );
};

export const ItemViewer = (props: ItemViewerParams<Item | null | undefined>) => {
  // ItemDiffViewer must be wrapped because it uses a hook
  if (!props.item) {
    return null;
  }
  // TODO?  seems like a weird way to force nullable into a non-nullable .item type
  return <ItemDiffViewer {...(props as ItemViewerParams<Item>)} />;
};
