import React, { useContext, useState, Dispatch } from 'react';

import { EuiButtonIcon, EuiHeaderLink, EuiPopover, EuiPopoverTitle, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { UserContext, UserState } from '../data/UserContext';
import { rootUrl, usePersistedState } from '../utils';

import { Props } from '../data/types';

// Modeled after https://www.carlrippon.com/react-context-with-typescript-p2/

export type SettingsContextType = {
  isDarkTheme: boolean
  setIsDarkTheme: Dispatch<boolean>
  isSplitView: boolean
  setIsSplitView: Dispatch<boolean>
  isIncrementalSearch: boolean
  setIsIncrementalSearch: Dispatch<boolean>
}

export const SettingsContext = React.createContext<SettingsContextType>({} as SettingsContextType);

export const SettingsProvider = ({ children }: Props) => {
  const [isDarkTheme, setIsDarkTheme] = usePersistedState<boolean>(
    'theme', 'light',
    // FIXME!  currently always force to light mode. Once CSS dynamic loading is enabled, remove the `&& false`
    v => v === 'dark' && false,
    v => v ? 'dark' : 'light');

  const [isSplitView, setIsSplitView] = usePersistedState<boolean>(
    `diff-split`, 'true', v => v === 'true', v => v ? 'true' : 'false');

  const [isIncrementalSearch, setIsIncrementalSearch] = usePersistedState<boolean>(
    `incremental-search`, 'true', v => v === 'true', v => v ? 'true' : 'false');

  // // @ts-ignore
  // [(isDarkTheme ? themeLight : themeDark)].unuse();
  // // @ts-ignore
  // [(isDarkTheme ? themeDark : themeLight)].use();

  return (
    <SettingsContext.Provider
      value={{ isDarkTheme, setIsDarkTheme, isSplitView, setIsSplitView, isIncrementalSearch, setIsIncrementalSearch }}>
      {children}
    </SettingsContext.Provider>
  );

};

const SettingsDialog = () => {
  const settings = useContext(SettingsContext);
  const { user } = useContext(UserContext);

  const results = [
    <EuiSwitch
      key={'theme'}
      label={'Night mode'}
      checked={settings.isDarkTheme}
      disabled
      onChange={e => settings.setIsDarkTheme(e.target.checked)}
    />,
    <EuiSpacer key={'s1'} size={'m'}/>,
    <EuiSwitch
      key={'split'}
      label={'Split diff view'}
      title={'Show page comparison side by side (split) or unified.'}
      checked={settings.isSplitView}
      onChange={e => settings.setIsSplitView(e.target.checked)}
    />,
    <EuiSpacer key={'s2'} size={'m'}/>,
    <EuiSwitch
      key={'inc'}
      label={'Incremental search'}
      title={'Search as you type. If disabled, you must press ENTER after entering the search query string. Disable when your computer is not performing fast enough when entering queries.'}
      checked={settings.isIncrementalSearch}
      onChange={e => settings.setIsIncrementalSearch(e.target.checked)}
    />,
    <EuiSpacer key={'s3'} size={'m'}/>,
    <EuiHeaderLink key={'logout'} disabled={user.state !== UserState.LoggedIn}
                   href={`${rootUrl}logout`}>Logout...</EuiHeaderLink>,
  ];

  return (<>{results}</>);
};

export const Settings = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const settingsButton = (<EuiButtonIcon
    iconSize={'m'}
    iconType={'gear'}
    onClick={() => setIsPopoverOpen(!isPopoverOpen)}
    aria-label={'Open options menu'}
    color={'text'}
  />);

  return (<EuiPopover
    button={settingsButton}
    isOpen={isPopoverOpen}
    closePopover={() => setIsPopoverOpen(false)}>
    <EuiPopoverTitle>Options</EuiPopoverTitle>
    {isPopoverOpen ? <SettingsDialog/> : null}
  </EuiPopover>);
};
