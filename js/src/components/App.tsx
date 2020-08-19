import React, { useContext, useMemo } from 'react';

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
import { ToastsProvider } from '../contexts/Toasts';
import { UserProvider } from '../contexts/UserContext';
import { SettingsContext, SettingsProvider } from '../contexts/Settings';
import { WorkArea } from './WorkArea';
import { Header } from './Header';
import { AllDataProvider } from '../contexts/AllData';
import { CurrentItemProvider } from '../contexts/CurrentItem';
import { I18nProvider } from '../contexts/I18nContext';
import { IntlProvider } from '@wikimedia/react.i18n';

export function AppWithSettings() {
  const { locale, messages } = useContext(SettingsContext);
  return useMemo(() => (
    <IntlProvider locale={locale} messages={messages}>
      <I18nProvider>
        <ToastsProvider>
          <UserProvider>
            <EuiPage>
              <EuiPageBody>
                <Header/>
                <AllDataProvider>
                  <CurrentItemProvider>
                    <WorkArea/>
                  </CurrentItemProvider>
                </AllDataProvider>
              </EuiPageBody>
            </EuiPage>
          </UserProvider>
        </ToastsProvider>
      </I18nProvider>
    </IntlProvider>
  ), [locale, messages]);
}

export function App() {
  return (
    <SettingsProvider>
      <AppWithSettings/>
    </SettingsProvider>
  );
}
