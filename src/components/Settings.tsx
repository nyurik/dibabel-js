import React, { useState } from 'react';

import { EuiButtonIcon, EuiPopover, EuiPopoverTitle, EuiSwitch } from '@elastic/eui';

export function Settings() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const button = (<EuiButtonIcon
    iconSize={'m'}
    iconType="gear"
    onClick={() => setIsPopoverOpen(!isPopoverOpen)}
    aria-label="Open options menu"
    color="text"
  />);

  return <EuiPopover
    button={button}
    isOpen={isPopoverOpen}
    closePopover={() => setIsPopoverOpen(false)}>
    <EuiPopoverTitle>Options</EuiPopoverTitle>
    <div className="guideOptionsPopover">
      <EuiSwitch
        label="Night mode"
        checked
        disabled
        onChange={() => alert('NOT IMPLEMENTED')}
      />
    </div>
  </EuiPopover>;
}
