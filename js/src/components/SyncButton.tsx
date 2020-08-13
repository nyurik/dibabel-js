import React, { Dispatch } from 'react';

import { EuiButton } from '@elastic/eui';
import { Item } from '../data/types';

export const SyncButton = (props: {
  selectedItems: Set<Item>,
  setSelectedItems: Dispatch<Set<Item>>,
}) => {
  if (props.selectedItems.size > 0) {
    const onClick = async () => {
      // store.processItems(...);
      props.setSelectedItems(new Set());
    };
    return (<EuiButton disabled title={'Multi-page sync is not yet implemented'} color={'danger'} iconType={'trash'} onClick={onClick}>
      Sync {props.selectedItems.size} pages
    </EuiButton>);
  } else {
    return null;
  }
};
