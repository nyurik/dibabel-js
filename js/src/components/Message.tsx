import React, { FunctionComponent, useContext } from 'react';
import { SettingsContext } from '../contexts/Settings';
import { Message as I18nMessage, MessageProps } from '@wikimedia/react.i18n';
import { EuiText, EuiTextProps } from '@elastic/eui';

// Wrap Banana Message to handle 'qqx' debug locale
export const Message: FunctionComponent<MessageProps & EuiTextProps> = ({ id, placeholders, ...rest }) => {
  const { locale } = useContext(SettingsContext);

  if (locale === 'qqx') {
    return <EuiText>{id}</EuiText>;
  }

  return <EuiText {...rest}><I18nMessage id={id} placeholders={placeholders}/></EuiText>;
};
