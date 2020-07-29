import React, { useState } from 'react';
import { EuiButtonIcon } from '@elastic/eui/es/components/button/button_icon';
import { EuiPopover, EuiPopoverTitle } from '@elastic/eui/es/components/popover';
import { EuiSwitch } from '@elastic/eui/es/components/form/switch';

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
