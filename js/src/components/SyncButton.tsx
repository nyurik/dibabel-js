import React, { Dispatch, useContext } from 'react';

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { Item } from '../types';
import { I18nContext } from '../contexts/I18nContext';

export const SyncButton = (props: {
  selectedItems: Set<Item>,
  setSelectedItems: Dispatch<Set<Item>>,
}) => {

  const { i18n } = useContext(I18nContext);

  if (props.selectedItems.size > 0) {
    const onClick = async () => {
      // store.processItems(...);
      props.setSelectedItems(new Set());
    };
    return (
      <EuiFlexItem grow={false}>
        <EuiButton disabled title={i18n('dibabel-sync-button--tooltip')} color={'danger'} iconType={'trash'}
                   onClick={onClick}>
          {i18n('dibabel-sync-button--label', props.selectedItems.size)}
        </EuiButton>
      </EuiFlexItem>
    );
  } else {
    return null;
  }
};
