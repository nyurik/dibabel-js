import React, { Dispatch } from 'react';
import { Props } from '../data/types';
// import themeLight from './theme_amsterdam-light.scss';
// import themeDark from './theme_amsterdam-dark.scss';
// import themeLight from '@elastic/eui/dist/eui_theme_amsterdam_light.css';
// import themeDark from '@elastic/eui/dist/eui_theme_amsterdam_dark.css';
// FIXME: remove this css and use the .unuse() / .use() methods below
import '@elastic/eui/dist/eui_theme_light.css';

// This should come last to override the defaults from EUI
import '../App.css';
import { usePersistedState } from '../utils';

// Modeled after https://www.carlrippon.com/react-context-with-typescript-p2/
export type SettingsContextType = {
  isDarkTheme: boolean
  setIsDarkTheme: Dispatch<boolean>
  isSplitView: boolean
  setIsSplitView: Dispatch<boolean>
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

  // // @ts-ignore
  // [(isDarkTheme ? themeLight : themeDark)].unuse();
  // // @ts-ignore
  // [(isDarkTheme ? themeDark : themeLight)].use();

  return (
    <SettingsContext.Provider value={{ isDarkTheme, setIsDarkTheme, isSplitView, setIsSplitView }}>
      {children}
    </SettingsContext.Provider>
  );

};
