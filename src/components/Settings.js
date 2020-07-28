import React, { useState } from 'react';
import * as U from '@elastic/eui';

export function Settings() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const button = (<U.EuiButtonIcon
    iconType="gear"
    onClick={() => setIsPopoverOpen(!isPopoverOpen)}
    aria-label="Open options menu"
    color="text"
  />);

  return <U.EuiPopover
    button={button}
    isOpen={isPopoverOpen}
    closePopover={() => setIsPopoverOpen(false)}>
    <U.EuiPopoverTitle>Options</U.EuiPopoverTitle>
    <div className="guideOptionsPopover">
      <U.EuiSwitch
        label="Night mode"
        checked
        disabled
        onChange={() => alert('NOT IMPLEMENTED')}
      />
    </div>
  </U.EuiPopover>;
}
