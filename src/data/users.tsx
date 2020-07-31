export type UserObj = { username: string };
export type UserInfo = UserObj | Symbol;

export const userPending = Symbol('Loading user info');
export const userUnknown = Symbol('Unknown user');
