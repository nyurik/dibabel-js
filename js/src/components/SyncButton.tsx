import React, { useContext, useMemo, useState } from 'react';

import { EuiButton, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { I18nContext } from '../contexts/I18nContext';
import { MultiSync } from './MultiSync';
import { SelectionContext } from '../contexts/SelectionContext';

export const SyncButton = () => {

  const { i18n } = useContext(I18nContext);
  const { selectedItems } = useContext(SelectionContext);

  const [isSyncShown, setIsSyncShown] = useState<boolean>(false);

  const syncDialog = useMemo(() => {
    if (isSyncShown) {
      if (selectedItems.size !== 0) {
        return (<MultiSync onClose={() => setIsSyncShown(false)}/>);
      }
      // This could happen if the data refreshes and there is no more selection
      setIsSyncShown(false);
    }
  }, [isSyncShown, selectedItems.size]);

  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={i18n('sync-button-tooltip--content')} position={'right'}>
        <EuiButton isDisabled={selectedItems.size === 0}
                   onClick={() => setIsSyncShown(true)}>
          {i18n('sync-button--label', selectedItems.size)}
        </EuiButton>
      </EuiToolTip>
      {syncDialog}
    </EuiFlexItem>
  );
};
