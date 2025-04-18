// Define types for user properties

import { UserObject } from '../models/user';

// Utility function to store JWT in cookies for a given clientId
export const storeJWTInCookies = (clientId: string, jwt: string): void => {
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 10); // Set expiration to 10 years in the future
  let cookieString = `auth_token_${clientId}=${jwt}; expires=${expirationDate.toUTCString()}; path=/`;

  // Only add Secure and SameSite=None if not on localhost
  if (window.location.hostname !== 'localhost') {
    cookieString += '; SameSite=None; Secure';
  }

  document.cookie = cookieString;
};

// Utility function to store user properties in localStorage for a given clientId
export const storeUserInLocalStorage = (
  clientId: string,
  userProperties: UserObject,
): void => {
  localStorage.setItem(`user_data_${clientId}`, JSON.stringify(userProperties));
};

// Utility function to get JWT from cookies for a given clientId
export const getJWTFromCookies = (clientId: string): string | null => {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`auth_token_${clientId}=`));
  return cookie ? cookie.split('=')[1] : null;
};

// Utility function to get user properties from localStorage for a given clientId
export const getUserFromLocalStorage = (clientId: string): UserObject | null => {
  const userData = localStorage.getItem(`user_data_${clientId}`);
  return userData ? JSON.parse(userData) : null;
};

// Utility function to get email granted permission from localStorage for a given clientId
export const setEmailGranted = (clientId: string, granted: boolean): void => {
  const key = `email_granted_${clientId}`;
  localStorage.setItem(key, JSON.stringify(granted));
};

export const getEmailGranted = (clientId: string): boolean => {
  const key = `email_granted_${clientId}`;
  const value = localStorage.getItem(key);

  // Parse the stored value or default to `false` if not set
  return value ? JSON.parse(value) : false;
};

// Utility function to clear the JWT and user data for a given clientId (for logout)
export const clearSessionData = (clientId: string): void => {
  document.cookie = `auth_token_${clientId}=; Max-Age=0`; // Expire JWT cookie immediately
  localStorage.removeItem(`user_data_${clientId}`); // Remove user data from localStorage
};
