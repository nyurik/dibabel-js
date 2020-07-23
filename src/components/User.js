import React from 'react';
import * as U from '@elastic/eui';
import $ from 'jquery';

export const userUnknown = {};
export const userPending = {};

export class User extends React.Component {
  render() {
    switch (this.props.user) {
      case userPending:
        return <U.EuiLoadingSpinner size="m"/>;
      case userUnknown:
        return <U.EuiHeaderLink href="https://dspull.toolforge.org/login.php">Login</U.EuiHeaderLink>;
      default:
        return this.props.user;
    }
  }
}

export const getUser = async () => {
  try {
    return await $.get(`https://dspull.toolforge.org/username.php`);
  } catch (e) {
    return userUnknown;
  }
}
