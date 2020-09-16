import React, { useContext, useMemo } from 'react';

// import themeLight from './theme_amsterdam-light.scss';
// import themeDark from './theme_amsterdam-dark.scss';
// import themeLight from '@elastic/eui/dist/eui_theme_amsterdam_light.css';
// import themeDark from '@elastic/eui/dist/eui_theme_amsterdam_dark.css';
// FIXME: remove this css and use the .unuse() / .use() methods below
import '@elastic/eui/dist/eui_theme_light.css';

// This should come last to override the defaults from EUI
import './App.css';

import { EuiErrorBoundary, EuiPage, EuiPageBody, EuiSpacer } from '@elastic/eui';
import { ToastsProvider } from '../contexts/Toasts';
import { UserProvider } from '../contexts/UserContext';
import { SettingsContext, SettingsProvider } from '../contexts/Settings';
import { Header } from './Header';
import { AllDataProvider } from '../contexts/AllData';
import { I18nProvider } from '../contexts/I18nContext';
import { IntlProvider } from '@wikimedia/react.i18n';
import { ResetProvider } from '../contexts/ResetContext';
import { SearchBar } from './SearchBar';
import { ItemViewer } from './ItemViewer';
import { SelectionProvider } from '../contexts/SelectionContext';
import { ItemsTable } from './ItemsTable';

export function AppWithSettings() {
  const { locale, messages } = useContext(SettingsContext);
  return useMemo(() => (
    <IntlProvider locale={locale} messages={messages}>
      <ToastsProvider>
        <I18nProvider>
          <UserProvider>
            <ResetProvider>
              <EuiPage>
                <EuiPageBody>
                  <Header/>
                  <AllDataProvider>
                    <SelectionProvider>
                      <SearchBar/>
                      <EuiSpacer size={'l'}/>
                      <ItemsTable/>
                      <ItemViewer/>
                    </SelectionProvider>
                  </AllDataProvider>
                </EuiPageBody>
              </EuiPage>
            </ResetProvider>
          </UserProvider>
        </I18nProvider>
      </ToastsProvider>
    </IntlProvider>
  ), [locale, messages]);
}

export function App() {
  return (
    <EuiErrorBoundary>
      <SettingsProvider>
        <AppWithSettings/>
      </SettingsProvider>
    </EuiErrorBoundary>
  );
}
