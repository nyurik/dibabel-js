import React from 'react';
import * as U from '@elastic/eui';

export const userUnknown = Symbol('Unknown user');
export const userPending = Symbol('Loading user info');

export class User extends React.Component {
  render() {
    switch (this.props.user) {
      case userPending:
        return <U.EuiLoadingSpinner size="m"/>;
      case userUnknown:
        return <U.EuiHeaderLink href="oauth_api.php?oauth_login">Login</U.EuiHeaderLink>;
      default:
        return this.props.user.username;
    }
  }
}

export const getUser = async () => {
  try {
    let userInfo = await fetch('oauth_api.php?oauth_identity');
    if (!userInfo.ok) {
      console.log(`${userInfo.status}: ${userInfo.statusText}\n${await userInfo.text()}`);
      return userUnknown;
    }
    return await userInfo.json();
  } catch (err) {
    console.log(`Unable to parse user info response.\n${err}`);
    return userUnknown;
  }
};
