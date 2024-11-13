// Define types for user properties

import { UserObject } from "../models/user";

  
  // Utility function to store JWT in cookies for a given clientId
  export const storeJWTInCookies = (clientId: string, jwt: string): void => {
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 10); // Set expiration to 10 years in the future
    
    document.cookie = `auth_token_${clientId}=${jwt}; expires=${expirationDate.toUTCString()}; path=/`;    
  };
  
  // Utility function to store user properties in localStorage for a given clientId
  export const storeUserInLocalStorage = (clientId: string, userProperties: UserObject): void => {
    localStorage.setItem(`user_data_${clientId}`, JSON.stringify(userProperties));
  };
  
  // Utility function to get JWT from cookies for a given clientId
  export const getJWTFromCookies = (clientId: string): string | null => {
    const cookie = document.cookie.split('; ').find(row => row.startsWith(`auth_token_${clientId}=`));
    return cookie ? cookie.split('=')[1] : null;
  };
  
  // Utility function to get user properties from localStorage for a given clientId
  export const getUserFromLocalStorage = (clientId: string): UserObject | null => {
    const userData = localStorage.getItem(`user_data_${clientId}`);
    return userData ? JSON.parse(userData) : null;
  };
  
  // Utility function to clear the JWT and user data for a given clientId (for logout)
  export const clearSessionData = (clientId: string): void => {
    document.cookie = `auth_token_${clientId}=; Max-Age=0`; // Expire JWT cookie immediately
    localStorage.removeItem(`user_data_${clientId}`); // Remove user data from localStorage
  };
  