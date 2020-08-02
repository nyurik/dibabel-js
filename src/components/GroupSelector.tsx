import React, { useState } from 'react';

import { EuiButton, EuiPopover, EuiSelectable, EuiSelectableOption } from '@elastic/eui';

export const GroupSelector = (props: {
  groupSelection: Array<EuiSelectableOption>,
  setGroupSelection: (value: Array<EuiSelectableOption>) => void,
}) => {
  const [isGroupListOpen, setIsGroupListOpen] = useState(false);

  return (
    <EuiPopover
      button={<EuiButton
        iconType="arrowDown"
        iconSide="right"
        onClick={() => setIsGroupListOpen(!isGroupListOpen)}
      >Group by...</EuiButton>}
      isOpen={isGroupListOpen}
      closePopover={() => setIsGroupListOpen(false)}>
      <EuiSelectable
        searchable={false}
        style={{ width: 200 }}
        onChange={groupChoices => props.setGroupSelection(groupChoices)}
        options={props.groupSelection}>
        {(list) => (<>{list}</>)}
      </EuiSelectable>
    </EuiPopover>
  );
};
