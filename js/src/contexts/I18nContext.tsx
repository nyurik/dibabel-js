import React, { SetStateAction, useContext, useEffect, useState } from 'react';
// import { IntlProvider } from '@wikimedia/react.i18n';
// import { Props } from '../types';
// import { SettingsContext } from './Settings';
// import { dbg } from '../utils';
//
//
// export type I18nContextType = {
//   // messages: Messages,
//   // setMessages: SetStateAction<Messages>
// }
//
// export const I18nContext = React.createContext<I18nContextType>({} as I18nContextType);
//
//
// export const I18nProvider = ({ children }: Props) => {
//   const { locale, messages } = useContext(SettingsContext);
//
//   // const banana = useContext(BananaContext);
//
//   debugger;
//   useEffect(() => {
//     setMessages({
//       ru: i18n_ru,
//     });
//   }, [setMessages]);
//
//   setMessages = dbg('setMessages', setMessages);
//   debugger;
//
//   return (
//     <I18nContext.Provider value={{ messages, setMessages }}>
//       <IntlProvider locale={locale} messages={messages}>
//         {children}
//       </IntlProvider>
//     </I18nContext.Provider>
//   );
// };
