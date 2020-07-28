import React, { useContext } from 'react';
import { useEuiTextDiff } from '@elastic/eui/es/components/text_diff';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui/es/components/flyout';
import { EuiTitle } from '@elastic/eui/es/components/title';
import { EuiCodeBlock } from '@elastic/eui/es/components/code';

export const DiffViewer = (props) => {
  const value = useContext(props.context);

  if (!value) {
    return;
  }

  // FIXME? This does not seem to be a hook, not sure why eslint complains
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [rendered, textDiffObject] = useEuiTextDiff({
    beforeText: props.item.dstText,
    afterText: props.item.srcText,
  });

  console.log(textDiffObject);

  return (
    <EuiFlyout
      ownFocus
      onClose={props.closeFlyout}
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
