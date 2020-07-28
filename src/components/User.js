import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui/es/components/loading';
import { EuiHeaderLink } from '@elastic/eui/es/components/header/header_links';

export const userPending = Symbol('Loading user info');
export const userUnknown = Symbol('Unknown user');

export function User(props) {
  switch (props.user) {
    case userPending:
      return <EuiLoadingSpinner size="m"/>;
    case userUnknown:
      return <EuiHeaderLink href="oauth_api.php?oauth_login">Login</EuiHeaderLink>;
    default:
      return props.user.username;
  }
}

export const getUser = async (addToast) => {
  try {
    let userInfo = await fetch('oauth_api.php?oauth_identity');
    if (!userInfo.ok) {
      addToast({
        title: `${userInfo.status}: ${userInfo.statusText}`,
        color: 'danger',
        iconType: 'alert',
        text: await userInfo.text(),
      });
      return userUnknown;
    }
    const json = await userInfo.json();
    addToast({
      title: `Logged in as ${json.username}`,
      color: 'success',
      iconType: 'check',
    });
    return json;
  } catch (err) {
    addToast({
      title: `Unable to parse user login`,
      color: 'danger',
      iconType: 'alert',
      text: `${err}`,
      toastLifeTimeMs: 15000,
    });
    return userUnknown;
  }
};
