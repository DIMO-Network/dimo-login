import { UserObject } from '../models/user';
import { jwtDecode } from 'jwt-decode';

const DEFAULT_COOKIE_EXPIRATION_DAYS = 14;

export const storeJWTInCookies = (clientId: string, jwt: string): void => {
  document.cookie = createCookieString(`auth_token_${clientId}`, jwt);
};

export const TurnkeySessionKey = 'turnkey_session';

const getExpiration = (jwt: string) => {
  let expirationDate = new Date();
  const decoded = jwtDecode(jwt);
  if (decoded.exp) {
    expirationDate = new Date(decoded.exp * 1000);
  } else {
    expirationDate.setDate(expirationDate.getDate() + DEFAULT_COOKIE_EXPIRATION_DAYS);
  }
  return expirationDate;
};

const createCookieString = (name: string, jwt: string): string => {
  const expires = getExpiration(jwt);
  let cookieString = `${name}=${jwt}; expires=${expires.toUTCString()}; path=/`;
  if (window.location.hostname !== 'localhost') {
    cookieString += '; SameSite=None; Secure';
  }
  return cookieString;
};

export const storeUserInLocalStorage = (
  clientId: string,
  userProperties: UserObject,
): void => {
  localStorage.setItem(`user_data_${clientId}`, JSON.stringify(userProperties));
};

export const getJWTFromCookies = (clientId: string): string | null => {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`auth_token_${clientId}=`));
  return cookie ? cookie.split('=')[1] : null;
};

export const getUserFromLocalStorage = (clientId: string): UserObject | null => {
  const userData = localStorage.getItem(`user_data_${clientId}`);
  return userData ? JSON.parse(userData) : null;
};

export const setEmailGranted = (clientId: string, granted: boolean): void => {
  const key = `email_granted_${clientId}`;
  localStorage.setItem(key, JSON.stringify(granted));
};

export const isEmailGranted = (clientId: string): boolean => {
  const key = `email_granted_${clientId}`;
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : false;
};

export const setLoggedEmail = (clientId: string, email: string): void => {
  const key = `logged_email_${clientId}`;
  localStorage.setItem(key, email);
};

export const getLoggedEmail = (clientId: string): string | null => {
  const key = `logged_email_${clientId}`;
  const value = localStorage.getItem(key);
  return value ? value : null;
};

export const clearLoggedEmail = (clientId: string): void => {
  localStorage.removeItem(`logged_email_${clientId}`);
};

export const clearSessionData = (clientId: string): void => {
  document.cookie = `auth_token_${clientId}=; Max-Age=0`;
  localStorage.removeItem(`user_data_${clientId}`);
  localStorage.removeItem(TurnkeySessionKey);
};

export const saveToLocalStorage = <T>(key: string, value: T): void => {
  const serializedValue = JSON.stringify(value);
  localStorage.setItem(key, serializedValue);
};

export const getFromLocalStorage = <T>(key: string): T | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const serializedValue = localStorage.getItem(key);
  if (!serializedValue) {
    return null;
  }
  return JSON.parse(serializedValue);
};

export const removeFromLocalStorage = (key: string): void => {
  localStorage.removeItem(key);
};
