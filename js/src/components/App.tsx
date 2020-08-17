import React from 'react';

// import themeLight from './theme_amsterdam-light.scss';
// import themeDark from './theme_amsterdam-dark.scss';
// import themeLight from '@elastic/eui/dist/eui_theme_amsterdam_light.css';
// import themeDark from '@elastic/eui/dist/eui_theme_amsterdam_dark.css';
// FIXME: remove this css and use the .unuse() / .use() methods below
import '@elastic/eui/dist/eui_theme_light.css';

// This should come last to override the defaults from EUI
import '../App.css';

// React component import
import { EuiPage, EuiPageBody } from '@elastic/eui';
import { ToastsProvider } from './Toasts';
import { UserProvider } from '../data/UserContext';
import { SettingsProvider } from './Settings';
import { WorkArea } from './WorkArea';
import { Header } from './Header';

export function App() {
  return (
    <SettingsProvider>
      <ToastsProvider>
        <UserProvider>
          <EuiPage>
            <EuiPageBody>
              <Header/>
              <WorkArea/>
            </EuiPageBody>
          </EuiPage>
        </UserProvider>
      </ToastsProvider>
    </SettingsProvider>
  );
}
