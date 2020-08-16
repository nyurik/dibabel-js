import React, { Dispatch, useContext, useEffect, useState } from 'react';
import { Props, Toast } from './types';
import { rootUrl } from '../utils';
import { ToastsContext } from '../components/Toasts';

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

function login(addToast: Dispatch<Toast>, setUser: Dispatch<UserType>) {
  (async () => {
    try {
      let data = await fetch(`${rootUrl}userinfo`);
      if (data.ok) {
        const json = await data.json();
        addToast({
          title: `Logged in as ${json.username}`,
          color: 'success',
          iconType: 'check',
        });
        setUser({ state: UserState.LoggedIn, ...json });
      } else {
        if (data.status === 403) {
          addToast({
            title: `Not logged in`,
            color: 'warning',
            iconType: 'user',
            text: 'Please login to edit pages',
          });
        } else {
          addToast({
            title: `${data.status}: ${data.statusText}`,
            color: 'danger',
            iconType: 'alert',
            text: await data.text(),
          });
        }
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

export const UserProvider = (props: Props) => {
  const addToast = useContext(ToastsContext);
  const [user, setUser] = useState<UserType>(defaultUserState);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => login(addToast, setUser), []);

  return (
    <UserContext.Provider value={{ user }}>
      {props.children}
    </UserContext.Provider>
  );

};
