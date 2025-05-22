/**
 * AuthContext.tsx
 *
 * This file provides the AuthContext and AuthProvider, which manage global authentication
 * state in the application. It can be used to store and access the user's authentication
 * status, user data, and login/logout functions across the entire application.
 *
 * Context:
 * - sendOtp method (to be used by OtpInput component)
 * - verifyOtp method (to be used by OtpInput component)
 * - authenticateUser method (to be used by OtpInput component)
 * - loading (to be used by email and otp input)
 *
 * Usage:
 * Wrap the application or a part of it with the AuthProvider to make the authentication
 * state available across the app. Use the useAuthContext hook to access the authentication
 * state and functions.

 */

import React, { createContext, ReactNode, useContext, useState } from 'react';

import {
  authenticateUser,
  handleAuthenticatedUser,
  handlePostAuthUIState,
} from '../utils/authUtils';
import { useDevCredentials } from './DevCredentialsContext';
import { UserObject } from '../models/user';
import { useUIManager } from './UIManagerContext';
import { TStamper } from '@turnkey/http/dist/base';

interface AuthContextProps {
  authenticateUser: (stamper: TStamper) => Promise<void>;
  user: UserObject;
  setUser: React.Dispatch<React.SetStateAction<UserObject>>;
  jwt: string;
  setJwt: React.Dispatch<React.SetStateAction<string>>;
  userInitialized: boolean;
  setUserInitialized: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

//This will be set on account creation partially, and completed on wallet connection
const defaultUser: UserObject = {
  email: '',
  smartContractAddress: '',
  subOrganizationId: '',
  hasPasskey: false,
  walletAddress: '',
  emailVerified: false,
};

// AuthProvider component to provide the context
export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [user, setUser] = useState<UserObject>(defaultUser);
  const [jwt, setJwt] = useState<string>('');
  const [userInitialized, setUserInitialized] = useState<boolean>(false);
  const { clientId, redirectUri, utm } = useDevCredentials();
  const { setUiState, entryState } = useUIManager();

  const handleAuthenticateUser = async (stamper: TStamper) => {
    if (!user.subOrganizationId) {
      throw new Error('User has not been initialized yet');
    }
    const { accessToken, walletAddress, smartContractAddress } = await authenticateUser(
      clientId,
      redirectUri,
      user.subOrganizationId,
      stamper,
    );
    const updatedUserObject: UserObject = {
      ...user,
      walletAddress,
      smartContractAddress,
    };
    setJwt(accessToken);
    setUser(updatedUserObject);
    handleAuthenticatedUser({ clientId, jwt: accessToken, user: updatedUserObject });
    handlePostAuthUIState({
      entryState,
      clientId,
      redirectUri,
      utm,
      setUiState,
      user: updatedUserObject,
      jwt: accessToken,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        authenticateUser: handleAuthenticateUser,
        user,
        setUser,
        jwt,
        setJwt,
        userInitialized,
        setUserInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use the AuthContext
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
