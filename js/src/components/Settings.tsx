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
        label={'Split diff view'}
        title={'Show page comparison side by side (split) or unified.'}
        checked={settings.isSplitView}
        onChange={e => settings.setIsSplitView(e.target.checked)}
      />,
      <EuiSpacer size={'m'}/>,
      <EuiSwitch
        label={'Incremental search'}
        title={'Search as you type. If disabled, you must press ENTER after entering the search query string. Disable when your computer is not performing fast enough when entering queries.'}
        checked={settings.isIncrementalSearch}
        onChange={e => settings.setIsIncrementalSearch(e.target.checked)}
      />,
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
