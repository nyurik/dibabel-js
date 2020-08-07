import React, { useState } from 'react';

import { EuiButtonIcon, EuiHeaderLink, EuiPopover, EuiPopoverTitle, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { ThemeContext } from '../themes/ThemeContext';
import { UserContext, UserState } from '../data/UserContext';
import { rootUrl } from '../utils';

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
    <ThemeContext.Consumer>
      {context => (<EuiSwitch
        label="Night mode"
        checked={context.isDarkTheme}
        disabled
        onChange={e => context.setIsDarkTheme(e.target.checked)}
      />)}
    </ThemeContext.Consumer>
    <UserContext.Consumer>
      {context => context.user.state === UserState.LoggedIn
        ? (<>
          <EuiSpacer size={"s"}/>
          <EuiHeaderLink href={`${rootUrl}logout`}>Logout...</EuiHeaderLink>
        </>)
        : null}
    </UserContext.Consumer>
  </EuiPopover>;
}
