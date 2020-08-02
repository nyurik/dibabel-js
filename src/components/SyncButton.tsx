import React from 'react';

import { EuiButton } from '@elastic/eui';
import { Item } from '../data/Store';

export const SyncButton = (props: {
  selectedItems: Set<Item>,
  setSelectedItems: (value: Set<Item>) => void,
}) => {
  if (props.selectedItems.size > 0) {
    const onClick = async () => {
      // store.processItems(...);
      props.setSelectedItems(new Set());
    };
    return (<EuiButton color="danger" iconType="trash" onClick={onClick}>
      Sync {props.selectedItems.size} items
    </EuiButton>);
  } else {
    return null;
  }
};
