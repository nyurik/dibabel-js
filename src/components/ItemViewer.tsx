import React from 'react';

import { EuiCodeBlock, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle, useEuiTextDiff } from '@elastic/eui';

import { Item } from '../data/Store';

interface ItemViewerParams<TItem> {
  item: TItem;
  close: (
    event?:
      | React.KeyboardEvent<HTMLDivElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => void
}

const ItemDiffViewer = (props: ItemViewerParams<Item>) => {
  const [rendered] = useEuiTextDiff({
    beforeText: props.item.dstText,
    afterText: props.item.srcText,
    timeout: 0.5,
  });

  return (
    <EuiFlyout
      ownFocus
      onClose={props.close}
      aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h3>{props.item.srcFullTitle}</h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock language={props.item.type === 'module' ? 'lua' : 'text'}>{rendered}</EuiCodeBlock>
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
