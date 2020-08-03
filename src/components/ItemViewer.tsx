import React from 'react';

import {
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTextDiff
} from '@elastic/eui';

import { Item } from '../data/types';
import { ItemDstLink, ItemSrcLink } from './Snippets';

interface ItemViewerParams<TItem> {
  item: TItem;
  onClose: (
    event?:
      | React.KeyboardEvent<HTMLDivElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => void
}

const ItemDiffViewer = ({ onClose, item }: ItemViewerParams<Item>) => {
  const [rendered] = useEuiTextDiff({
    beforeText: item.dstText,
    afterText: item.srcText,
    timeout: 0.5,
  });

  let infoSubHeader;
  if (item.diverged) {
    infoSubHeader = (
      <EuiText>The current version of{' '}<ItemDstLink item={item}/>{' '}({item.dstSite}) was not found in the history
        of the primary page <ItemSrcLink item={item}/>.</EuiText>);
  } else {
    infoSubHeader = (<EuiText>Page{' '}<ItemDstLink item={item}/>{' '}({item.dstSite}) is {item.behind} revisions behind the primary{' '}<ItemSrcLink item={item}/>.</EuiText>);
  }
  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h3>{item.srcFullTitle}</h3>
        </EuiTitle>
        <EuiSpacer size={'s'}/>
        {infoSubHeader}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock language={item.type === 'module' ? 'lua' : 'text'}>{rendered}</EuiCodeBlock>
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
