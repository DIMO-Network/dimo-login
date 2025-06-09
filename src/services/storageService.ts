import { UserObject } from '../models/user';

const DEFAULT_COOKIE_EXPIRATION_DAYS = 14; // Default expiration for cookies is 2 weeks

export const storeJWTInCookies = (clientId: string, jwt: string): void => {
  document.cookie = createCookieString(`auth_token_${clientId}`, jwt);
};

const createCookieString = (
  name: string,
  value: string,
): string => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + DEFAULT_COOKIE_EXPIRATION_DAYS);
  
  let cookieString = `${name}=${value}; expires=${expirationDate.toUTCString()}; path=/`;
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
};
