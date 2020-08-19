import React, { useContext } from 'react';
import { BananaContext } from '@wikimedia/react.i18n';
import { Props } from '../types';

type I18n = (id: string, ...args: any) => string;

export interface I18nContextType {
  i18n: I18n;
}

export const I18nContext = React.createContext<I18nContextType>({} as I18nContextType);

export const I18nProvider = ({ children }: Props) => {
  const banana = useContext(BananaContext);
  return (
    <I18nContext.Provider value={{ i18n: banana.i18n.bind(banana) }}>
      {children}
    </I18nContext.Provider>
  );
};
