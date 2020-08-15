import React, { useState, useContext } from 'react';

import { EuiButtonIcon, EuiHeaderLink, EuiPopover, EuiPopoverTitle, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { SettingsContext } from './SettingsContext';
import { UserContext, UserState } from '../data/UserContext';
import { rootUrl } from '../utils';

export function Settings() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const settings = useContext(SettingsContext);
  const { user } = useContext(UserContext);

  const settingsButton = (<EuiButtonIcon
    iconSize={'m'}
    iconType={'gear'}
    onClick={() => setIsPopoverOpen(!isPopoverOpen)}
    aria-label={'Open options menu'}
    color={'text'}
  />);

  let elements = null;

  if (isPopoverOpen) {
    elements = [
      <EuiSwitch
        label={'Night mode'}
        checked={settings.isDarkTheme}
        disabled
        onChange={e => settings.setIsDarkTheme(e.target.checked)}
      />,
      <EuiSpacer size={'m'}/>,
      <EuiSwitch
        label={'Split diff'}
        checked={settings.isSplitView}
        onChange={e => settings.setIsSplitView(e.target.checked)}
      />
    ];

    if (user.state === UserState.LoggedIn) {
      elements.push(<EuiSpacer size={'m'}/>);
      elements.push(<EuiHeaderLink href={`${rootUrl}logout`}>Logout...</EuiHeaderLink>);
    }
  }

  return (<EuiPopover
    button={settingsButton}
    isOpen={isPopoverOpen}
    closePopover={() => setIsPopoverOpen(false)}>
    <EuiPopoverTitle>Options</EuiPopoverTitle>
    {elements}
  </EuiPopover>);
}
