import React, { useEffect, useState } from 'react';

import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTextDiff
} from '@elastic/eui';

import { Item } from '../data/types';
import { ItemDstLink, ItemSrcLink, ItemWikidataLink, ProjectIcon } from './Snippets';
import { rootUrl } from '../utils';

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
    beforeText: oldText  ,
    afterText: newText,
    timeout: 0.5,
  });
  return <EuiCodeBlock language={type === 'module' ? 'lua' : 'text'}>{rendered}</EuiCodeBlock>;
};

const ItemDiffViewer = ({ onClose, item }: ItemViewerParams<Item>) => {

  const [content, setContent] = useState<React.ReactElement | undefined>();

  useEffect(() => {
    (async () => {
      let newContent;
      try {
        const result = await fetch(`${rootUrl}page/${item.qid}/${item.dstSite}`);
        if (result.ok) {
          let data = await result.json();
          newContent = (<ItemDiffBlock type={item.type} oldText={data.currentText} newText={data.newText}/>);
        } else {
          const msg = `Unable to get the page. ${result.status}: ${result.statusText}\n${await result.text()}`;
          newContent = (<EuiCallOut title="Error loading content..." color="danger" iconType="alert">
            <p>{msg}</p>
          </EuiCallOut>);
        }
      } catch (err) {
        newContent = (<EuiCallOut title="Error loading content..." color="danger" iconType="alert">
          <p>{err.toString()}</p>
        </EuiCallOut>);
      }
      setContent(newContent);
    })();
  }, [item]);

  const body = content ?? (<EuiProgress size="s" color="accent" label={'Loading page content...'}/>);

  let infoSubHeader;
  switch (item.status) {
    case 'diverged':
      infoSubHeader = (
        <EuiText>The current version of{' '}<ItemDstLink item={item}/>{' '}({item.dstSite}) was not found in the history
          of the primary page <ItemSrcLink item={item}/>.</EuiText>);
      break;
    case 'outdated':
      infoSubHeader = (
        <EuiText>Page{' '}<ItemDstLink item={item}/>{' '}({item.dstSite}) is {item.behind} revisions behind the
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
    return links
      .reduce<any>((acc, el) => {
        if (!acc) {
          acc.push(', ');
        }
        acc.push(<EuiLink href={`https://${site}/wiki/${el}`} target="_blank">{el}</EuiLink>);
        return acc;
      }, []);
  }

  const warnings = [];
  if (item.not_multisite_deps) {
    warnings.push(<EuiSpacer size={'m'}/>);
    warnings.push(<EuiCallOut title="This page has dependencies which are not enabled for synchronization"
                              color="warning" iconType="alert">
      <p>Most of the time this means that page <ItemSrcLink item={item}/> is not ready yet for synchronization, and
        should not have a multi-site type in <ItemWikidataLink item={item}/>.<br/>
        Alternatively it could also mean that the page was edited to use a new template/module, and that the new
        page is not enabled for synchronization.</p>
      <p>{formatLinks(item.dstSite, item.not_multisite_deps)}</p>
    </EuiCallOut>);
  }
  if (item.multisite_deps_not_on_dst) {
    warnings.push(<EuiSpacer size={'m'}/>);
    warnings.push(<EuiCallOut title={`This page dependencies do not exist in ${item.dstSite}`} color="warning"
                              iconType="alert">
      <p>This page depends on one or more synchronizable pages that are not present on the destination site. Copy the
        content of these pages to <EuiLink href={`https://${item.dstSite}`} target="_blank">{item.dstSite}</EuiLink> and
        make sure they are listed in the <ItemWikidataLink item={item}/>.</p>
      <p>{formatLinks(item.srcSite, item.multisite_deps_not_on_dst)}</p>
    </EuiCallOut>);
  }

  return (
    <EuiFlyout
      ownFocus
      size={'l'}
      onClose={onClose}
      aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h3>{item.srcFullTitle}</h3>
        </EuiTitle>
        <EuiSpacer size={'s'}/>
        <EuiFlexGroup alignItems={'center'} gutterSize={'s'}>
          <EuiFlexItem grow={false}><ProjectIcon item={item} size={'xl'}/></EuiFlexItem>
          <EuiFlexItem grow={true}>{infoSubHeader}</EuiFlexItem>
        </EuiFlexGroup>
        {warnings}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {body}
      </EuiFlyoutBody>
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
