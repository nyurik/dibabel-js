import React, { Dispatch, useEffect } from 'react';
import { AddToast } from './types';
import { rootUrl } from '../utils';

export enum UserState {
  Unknown,
  LoggedIn,
  LoggedOut,
}

export type UserType = {
  state: UserState,
  username?: string,
};

export type UserContextType = {
  user: UserType,
};

const defaultUserState = { state: UserState.Unknown };
export const loggedOutState = { state: UserState.LoggedOut };

export const UserContext = React.createContext<UserContextType>({} as UserContextType);

function login(addToast: AddToast, setUser: Dispatch<UserType>) {
  (async () => {
    try {
      let userInfo = await fetch(`${rootUrl}oauth_api.php?oauth_identity`);
      if (userInfo.ok) {
        const json = await userInfo.json();
        addToast({
          title: `Logged in as ${json.username}`,
          color: 'success',
          iconType: 'check',
        });
        setUser({ state: UserState.LoggedIn, ...json });
      } else {
        addToast({
          title: `${userInfo.status}: ${userInfo.statusText}`,
          color: 'danger',
          iconType: 'alert',
          text: await userInfo.text(),
        });
        setUser(loggedOutState);
      }
    } catch (err) {
      addToast({
        title: `Unable to parse user login`,
        color: 'danger',
        iconType: 'alert',
        text: `${err}`,
        toastLifeTimeMs: 15000,
      });
      setUser(loggedOutState);
    }
  })();
}

// FIXME: addToast: AddToast does not work for some reason
export const UserProvider = (props: {
  children: React.ReactNode,
  addToast: AddToast,
}) => {
  const [user, setUser] = React.useState<UserType>(defaultUserState);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => login(props.addToast, setUser), []);

  return (
    <UserContext.Provider value={{ user }}>
      {props.children}
    </UserContext.Provider>
  );

};
