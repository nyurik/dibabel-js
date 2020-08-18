import React, { Dispatch } from 'react';

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { Item } from '../types';

export const SyncButton = (props: {
  selectedItems: Set<Item>,
  setSelectedItems: Dispatch<Set<Item>>,
}) => {
  if (props.selectedItems.size > 0) {
    const onClick = async () => {
      // store.processItems(...);
      props.setSelectedItems(new Set());
    };
    return (
      <EuiFlexItem grow={false}>
        <EuiButton disabled title={'Multi-page sync is not yet implemented'} color={'danger'} iconType={'trash'}
                   onClick={onClick}>
          Sync {props.selectedItems.size} pages
        </EuiButton>
      </EuiFlexItem>
    );
  } else {
    return null;
  }
};
