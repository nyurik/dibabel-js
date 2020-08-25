import React, { useContext } from 'react';
import { EuiHeaderLink, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { UserContext, UserState } from '../contexts/UserContext';
import { rootUrlData } from '../utils';
import { I18nContext } from '../contexts/I18nContext';

export const User = () => {
  const { i18n } = useContext(I18nContext);
  const { user } = useContext(UserContext);

  switch (user.state) {
    case UserState.Unknown:
      return <EuiLoadingSpinner size={'m'}/>;
    case UserState.LoggedOut:
      return <EuiHeaderLink href={`${rootUrlData}login`}>{i18n('dibabel-user-login')}</EuiHeaderLink>;
    case UserState.LoggedIn:
      return <EuiText>{user.username}</EuiText>;
    default:
      throw new Error(user.state);
  }
};
