import React from 'react';
import { EuiHeaderLink, EuiLoadingSpinner } from '@elastic/eui';
import { AddToast } from '../data/languages';
import { UserInfo, UserObj, userPending, userUnknown } from '../data/users';

export const User = (props: { user: UserInfo }) => {
  switch (props.user) {
    case userPending:
      return <EuiLoadingSpinner size="m"/>;
    case userUnknown:
      return <EuiHeaderLink href="oauth_api.php?oauth_login">Login</EuiHeaderLink>;
    default:
      return <b>{(props.user as UserObj).username}</b>;
  }
};

export const getUser = async (addToast: AddToast) => {
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
