import React from 'react';
import { useEuiTextDiff } from '@elastic/eui/es/components/text_diff';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui/es/components/flyout';
import { EuiTitle } from '@elastic/eui/es/components/title';
import { EuiCodeBlock } from '@elastic/eui/es/components/code';

const ItemDiffViewer = (props) => {
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

export const ItemViewer = (props) => {
  // ItemDiffViewer must be wrapped because it uses a hook
  if (!props.item) {
    return null;
  }
  return <ItemDiffViewer {...props} />;
};
