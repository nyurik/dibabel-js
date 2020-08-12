import React, { FunctionComponent, useEffect, useState } from 'react';

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

import { Item } from '../data/types';
import { ItemDiffLink, ItemDstLink, ItemSrcLink, ItemWikidataLink, ProjectIcon } from './Snippets';
import { postToApi, rootUrl } from '../utils';
import { UserContext, UserState } from '../data/UserContext';

interface ItemViewerParams<TItem> {
  item: TItem;
  onClose: (
    event?:
      | React.KeyboardEvent<HTMLDivElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => void
}

const ItemDiffBlock = ({ type, oldText, newText }: { type: string, oldText: string, newText: string }) => {
  const [rendered] = useEuiTextDiff({
    beforeText: oldText,
    afterText: newText,
    timeout: 0.5,
  });
  return <EuiCodeBlock language={type === 'module' ? 'lua' : 'text'}>{rendered}</EuiCodeBlock>;
};

const Comment: FunctionComponent<{ readOnly: boolean, value: string, setValue: (value: string) => void }> = ({ readOnly, value, setValue }) => {
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

const ItemDiffViewer = ({ onClose, item }: ItemViewerParams<Item>) => {

  const [content, setContent] = useState<{ status: 'loading' | 'error' | 'ok', data?: any }>({ status: 'loading' });

  // FIXME! changes to the comment force full refresh of this component!
  // TODO: lookup how to do this better (share state with subcomponent, refernce, etc)
  const [comment, setComment] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const result = await fetch(`${rootUrl}page/${item.qid}/${item.dstSite}`);
        if (result.ok) {
          let data = await result.json();
          setContent({ status: 'ok', data });
          setComment(data.summary || '');
        } else {
          setContent({
            status: 'error',
            data: `Unable to get the page. ${result.status}: ${result.statusText}\n${await result.text()}`
          });
        }
      } catch (err) {
        setContent({ status: 'error', data: err.toString() });
      }
    })();
  }, [item]);

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
    default:
      throw new Error(`Unhandled ${item.status}`);
  }

  function formatLinks(site: string, links: Array<string>) {
    return (<ul>
      {links.map(el => (<li><EuiLink href={`https://${site}/wiki/${el}`} target="_blank">{el}</EuiLink></li>))}
    </ul>);
  }

  const warnings = [];
  if (item.not_multisite_deps) {
    warnings.push(<EuiCallOut title="Dependencies are not enabled for synchronization" color="warning" iconType="alert">
      <EuiText>This page depends on templates or modules that have not been tagged as "multi-site" in Wikidata.
        Most of the time this means that page <ItemSrcLink item={item}/> is not yet ready for synchronization, and
        should not have a multi-site type in <ItemWikidataLink item={item}/>. Alternatively it could also mean that the
        page was edited to use a new template/module, and that the new page is not enabled for
        synchronization.</EuiText>
      <EuiSpacer size={'s'}/>
      <EuiText>{formatLinks(item.dstSite, item.not_multisite_deps)}</EuiText>
    </EuiCallOut>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  if (item.multisite_deps_not_on_dst) {
    warnings.push(<EuiCallOut title={`Dependencies do not exist in ${item.dstSite}`} color="warning" iconType="alert">
      <EuiText>This page depends on templates or modules that are not present on the destination site. Copy
        the content of these pages to
        <EuiLink href={`https://${item.dstSite}`} target="_blank">{item.dstSite}</EuiLink> and make sure they are listed
        in the <ItemWikidataLink item={item}/>.</EuiText>
      <EuiSpacer size={'s'}/>
      <EuiText>{formatLinks(item.srcSite, item.multisite_deps_not_on_dst)}</EuiText>
    </EuiCallOut>);
    warnings.push(<EuiSpacer size={'m'}/>);
  }

  let body;
  switch (content.status) {
    case 'loading':
      body = (<EuiProgress size="s" color="accent" label={'Loading page content...'}/>);
      break;
    case 'error':
      body = (<EuiCallOut title="Error loading content..." color="danger" iconType="alert">
        <p>{content.data}</p>
      </EuiCallOut>);
      break;
    case 'ok':
      body = (<ItemDiffBlock type={item.type} oldText={content.data.currentText} newText={content.data.newText}/>);
      break;
    default:
      throw new Error(content.status);
  }

  const onCopy = async () => {
    try {
      let res = await postToApi(item.dstSite, {
        meta: 'tokens',
        type: 'csrf',
      });

      const token = res.tokens.csrftoken;

      res = await postToApi(item.dstSite, {
        action: 'edit',
        title: item.dstTitle,
        text: content.data.newText,
        summary: comment,
        basetimestamp: content.data.contentTimestamp,
        nocreate: '1',
        token: token,
      });
      if (res.edit.result !== 'Success') {
        setContent({ status: 'error', data: res.edit.info || JSON.stringify(res.edit) });
      }
    } catch (err) {
      setContent({ status: 'error', data: err.toString() });
    }
  };

  return (
    <EuiFlyout
      ownFocus
      size={'l'}
      onClose={onClose}
      aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
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
              {context => context.user.state === UserState.LoggedIn && context.user.username === 'Yurik'
                ? (<EuiButton fill disabled={content.status !== 'ok'} color={'danger'} onClick={onCopy}>
                    Copy!
                  </EuiButton>)
                : (<EuiButton fill disabled={content.status !== 'ok'} color={'danger'} onClick={onClose}>
                  Copy (disabled)
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
