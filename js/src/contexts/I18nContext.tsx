import React, { useContext, useEffect } from 'react';
import { BananaContext } from '@wikimedia/react.i18n';
import { Props } from '../types';
import { SettingsContext } from './Settings';

export type I18n = (id: string, ...args: any) => string;

export interface I18nContextType {
  i18n: I18n;
}

const rtlLanguages = new Set([
  'aeb-arab', 'ar', 'arc', 'arz', 'azb', 'bcc', 'bgn', 'bqi', 'ckb', 'dv', 'fa', 'glk', 'he', 'khw', 'kk-arab', 'kk-cn',
  'ks-arab', 'ku-arab', 'lki', 'lrc', 'luz', 'mzn', 'nqo', 'pnb', 'ps', 'sd', 'sdh', 'skr-arab', 'ug-arab', 'ur', 'yi',
]);

export const I18nContext = React.createContext<I18nContextType>({} as I18nContextType);

export const I18nProvider = ({ children }: Props) => {
  const { locale } = useContext(SettingsContext);
  const banana = useContext(BananaContext);
  // Allow debugging code
  const i18n = locale === 'qqx' ? (id: string) => id : banana.i18n.bind(banana);

  // We must modify the entire body because tooltips and popups are outside of the context in the tree
  useEffect(() => {
    document.body.lang = locale;
    document.body.dir = rtlLanguages.has(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  return (
    <I18nContext.Provider value={{ i18n }}>
      {children}
    </I18nContext.Provider>
  );
};
