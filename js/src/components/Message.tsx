import React, { FunctionComponent, useContext } from 'react';
import { SettingsContext } from '../contexts/Settings';
import { Message as I18nMessage, MessageProps } from '@wikimedia/react.i18n';

// Wrap Banana Message to handle 'qqx' debug locale
export const Message: FunctionComponent<MessageProps> = ({ id, placeholders }) => {
  const { locale } = useContext(SettingsContext);

  if (locale === 'qqx') {
    return <>{id}</>;
  }

  return <I18nMessage id={id} placeholders={placeholders}/>;
};
