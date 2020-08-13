import React, { Dispatch, FunctionComponent, useEffect, useMemo, useState, useContext } from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTextDiff
} from '@elastic/eui';

import { Item, SyncContentType, UpdateItems } from '../data/types';
import { ItemDiffLink, ItemDstLink, ItemSrcLink, ItemWikidataLink, ProjectIcon } from './Snippets';
import { getToken, postToApi, rootUrl, sleep } from '../utils';
import { UserContext, UserState } from '../data/UserContext';
import { ToastsContext } from './Toasts';

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
const ItemDiffBlock = ({ type, oldText, newText }: { type: string, oldText: string, newText: string }) => {
  const [rendered] = useEuiTextDiff({
    beforeText: oldText,
    afterText: newText,
    timeout: 0.5,
  });
  return <EuiCodeBlock language={type === 'module' ? 'lua' : 'text'}>{rendered}</EuiCodeBlock>;
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
    const result = await fetch(`${rootUrl}page/${item.qid}/${item.dstSite}`);
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
  const [content, setContent] = useState<ContentType>({ status: 'loading' });

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
      infoSubHeader = (
        <EuiText>The current version of{' '}<ItemDstLink item={item}/>{' '}({item.dstSite}) was not found in the history
          of the primary page <ItemSrcLink item={item}/>.</EuiText>);
      break;
    case 'outdated':
      infoSubHeader = (
        <EuiText>Page{' '}<ItemDstLink item={item}/>{' '}({item.dstSite}) is{' '}<ItemDiffLink
          item={item}>{item.behind} revisions</ItemDiffLink>{' '}behind the
          primary{' '}<ItemSrcLink item={item}/>.</EuiText>);
      break;
    case 'unlocalized':
      infoSubHeader = (
        <EuiText>Page{' '}<ItemDstLink item={item}/>{' '}({item.dstSite}) is identical with the original <ItemSrcLink
          item={item}/>, but needs to have some localizations.</EuiText>);
      break;
    case 'ok':
      infoSubHeader = (
        <EuiText>Page{' '}<ItemDstLink item={item}/>{' '}({item.dstSite}) is identical with the original <ItemSrcLink
          item={item}/>.</EuiText>);
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
  if (item.notMultisiteDeps) {
    warnings.push(<EuiCallOut title={'Dependencies are not enabled for synchronization'} color={'warning'}
                              iconType={'alert'}>
      <EuiText>This page depends on templates or modules that have not been tagged as "multi-site" in Wikidata.
        Most of the time this means that page <ItemSrcLink item={item}/> is not yet ready for synchronization, and
        should not have a multi-site type in <ItemWikidataLink item={item}/>. Alternatively it could also mean that the
        page was edited to use a new template/module, and that the new page is not enabled for
        synchronization.</EuiText>
      <EuiSpacer size={'s'}/>
      <EuiText>{formatLinks(item.dstSite, item.notMultisiteDeps)}</EuiText>
    </EuiCallOut>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  if (item.multisiteDepsNotOnDst) {
    warnings.push(<EuiCallOut title={`Dependencies do not exist in ${item.dstSite}`} color={'warning'}
                              iconType={'alert'}>
      <EuiText>This page depends on templates or modules that are not present on the destination site. Copy
        the content of these pages to
        <EuiLink href={`https://${item.dstSite}`} target={'_blank'}>{item.dstSite}</EuiLink> and make sure they are
        listed
        in the <ItemWikidataLink item={item}/>.</EuiText>
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
      let res = await postToApi(item.dstSite, {
        action: 'edit',
        title: item.dstFullTitle,
        text: content.data!.newText,
        summary: comment,
        basetimestamp: content.data!.syncInfo.timestamp,
        nocreate: '1',
        token: await getToken(item.dstSite),
      });
      if (res.edit.result !== 'Success') {
        setContent({ status: 'error', data: res.edit.info || JSON.stringify(res.edit) });
        return;
      }
      onClose();
      addToast({
        title: `${item.dstFullTitle} @ ${item.dstSite} was updated`,
        color: 'success',
      });

      let tries = 0;
      const maxTries = 30;
      for (; tries < maxTries; tries++) {
        const res = await getPageData(item);
        if (res.status !== 'ok' || updateItemIfChanged(item, res.data!, updateItem)) {
          break;
        }
        // Sleep, bot no longer than 10 seconds each time
        await sleep(1000 * Math.min(10, tries));
      }
      if (tries === maxTries) {
        addToast({
          title: `${item.dstFullTitle} was updated, but the DiBabel server was not able to get updated information.`,
          color: 'danger',
          iconType: 'alert',
        });
      }

    } catch (err) {
      addToast({
        title: `Error while saving ${item.dstFullTitle}: ${err.toString()}`,
        color: 'danger',
        iconType: 'alert',
      });
    }
  };

  return (
    <EuiFlyout
      ownFocus
      size={'l'}
      onClose={onClose}
      aria-labelledby={'flyoutTitle'}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size={'m'}>
          <EuiFlexGroup alignItems={'center'} gutterSize={'s'}>
            <EuiFlexItem grow={false}><ProjectIcon item={item} size={'xl'}/></EuiFlexItem>&nbsp;
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
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent={'spaceBetween'} alignItems={'center'}>
          <EuiFlexItem grow={false}>
            <EuiText>Summary:</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <Comment readOnly={content.status !== 'ok'} value={comment} setValue={setComment}/>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <UserContext.Consumer>
              {context => context.user.state === UserState.LoggedIn
                ? (<EuiButton fill disabled={content.status !== 'ok'} color={'danger'} onClick={onCopy}>
                  Copy!
                </EuiButton>)
                : (<EuiButton fill disabled={true} title={'Please login in the upper right corner before copying.'} color={'danger'} onClick={onClose}>
                  Copy!
                </EuiButton>)}
            </UserContext.Consumer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
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
