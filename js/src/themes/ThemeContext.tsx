import React, { Dispatch } from 'react';
import { Props } from '../data/types';
// import themeLight from './theme_amsterdam-light.scss';
// import themeDark from './theme_amsterdam-dark.scss';
// import themeLight from '@elastic/eui/dist/eui_theme_amsterdam_light.css';
// import themeDark from '@elastic/eui/dist/eui_theme_amsterdam_dark.css';

// FIXME: remove this css and use the .unuse() / .use() methods below
import '@elastic/eui/dist/eui_theme_amsterdam_dark.css';

// This should come last to override the defaults from EUI
import '../App.css';


// Modeled after https://www.carlrippon.com/react-context-with-typescript-p2/
export type ThemeContextType = {
  isDarkTheme: boolean
  setIsDarkTheme: Dispatch<boolean>
}
export const ThemeContext = React.createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: Props) => {
  const [isDarkTheme, setIsDarkTheme] = React.useState<boolean>(false);

  React.useEffect(() => {
    const newTheme = (localStorage.getItem('theme') ?? 'dark') !== 'light';
    setIsDarkTheme(newTheme);
  }, []);

  if (isDarkTheme) {
    // // @ts-ignore
    // [(isDarkTheme ? themeLight : themeDark)].unuse();
    // // @ts-ignore
    // [(isDarkTheme ? themeDark : themeLight)].use();

    try {
      localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light')
    } catch {
      // Ignore when unable to store theme usage to local store - could be in privacy mode
    }
  }

  return (
    <ThemeContext.Provider value={{isDarkTheme, setIsDarkTheme}}>
      {children}
    </ThemeContext.Provider>
  );

};
