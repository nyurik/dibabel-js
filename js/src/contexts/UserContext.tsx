import React, { Dispatch, useContext, useEffect, useState } from 'react';
import { Props, ToastNoId } from '../services/types';
import { error, rootUrlSite, success, warning } from '../services/utils';
import { ToastsContext } from './Toasts';

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

function login(addToast: Dispatch<ToastNoId>, setUser: Dispatch<UserType>) {
  (async () => {
    try {
      let data = await fetch(`${rootUrlSite}userinfo`);
      if (data.ok) {
        const json = await data.json();
        addToast(success({ title: `Logged in as ${json.username}`, iconType: 'user' }));
        setUser({ state: UserState.LoggedIn, ...json });
      } else {
        if (data.status === 403) {
          addToast(warning({ title: `Not logged in`, iconType: 'user', text: 'Please login to edit pages' }));
        } else {
          addToast(error({ title: `${data.status}: ${data.statusText}`, text: await data.text() }));
        }
        setUser(loggedOutState);
      }
    } catch (err) {
      addToast(error({ title: `Unable to parse user login`, text: `${err}`, toastLifeTimeMs: 15000, }));
      setUser(loggedOutState);
    }
  })();
}

export const UserProvider = ({ children }: Props) => {
  const { addToast } = useContext(ToastsContext);
  const [user, setUser] = useState<UserType>(defaultUserState);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => login(addToast, setUser), []);

  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );

};
