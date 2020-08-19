import React, { useContext } from 'react';
import { EuiHeaderLink, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { UserContext, UserState } from '../contexts/UserContext';
import { rootUrlData } from '../utils';

export const User = () => {
  const { user } = useContext(UserContext);

  switch (user.state) {
    case UserState.Unknown:
      return <EuiLoadingSpinner size={'m'}/>;
    case UserState.LoggedOut:
      return <EuiHeaderLink href={`${rootUrlData}login`}>Login</EuiHeaderLink>;
    case UserState.LoggedIn:
      return <EuiText>{user.username}</EuiText>;
    default:
      throw new Error(`Unknown user state ${user.state}`);
  }
};
