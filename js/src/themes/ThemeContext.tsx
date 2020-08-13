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
export type ThemeContextType = {
  isDarkTheme: boolean
  setIsDarkTheme: Dispatch<boolean>
}
export const ThemeContext = React.createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: Props) => {
  const [isDarkTheme, setIsDarkTheme] = usePersistedState<boolean>(
    'theme', 'light', v => v === 'light', v => v ? 'dark' : 'light');

  // // @ts-ignore
  // [(isDarkTheme ? themeLight : themeDark)].unuse();
  // // @ts-ignore
  // [(isDarkTheme ? themeDark : themeLight)].use();

  return (
    <ThemeContext.Provider value={{ isDarkTheme, setIsDarkTheme }}>
      {children}
    </ThemeContext.Provider>
  );

};
