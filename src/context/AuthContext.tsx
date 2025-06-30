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
  createSession,
  handlePostAuthUIState,
  updateTurnkeySession,
} from '../utils/authUtils';
import { useDevCredentials } from './DevCredentialsContext';
import { UserObject } from '../models/user';
import { UiStates } from '../enums';
import { useUIManager } from './UIManagerContext';
import { TStamper } from '@turnkey/http/dist/base';
import {
  getApiKeyStamper,
  getFromLocalStorage,
  initializePasskey,
  passkeyStamper,
  removeFromLocalStorage,
  TurnkeySessionData,
  TurnkeySessionDataWithExpiry,
  TurnkeySessionKey,
  verifyOtp,
} from '../services';
import { generateP256KeyPair } from '@turnkey/crypto';
import { getKernelSigner } from '../services';

interface AuthContextProps {
  completePasskeyLogin: () => Promise<void>;
  user: UserObject;
  setUser: React.Dispatch<React.SetStateAction<UserObject>>;
  jwt: string;
  setJwt: React.Dispatch<React.SetStateAction<string>>;
  userInitialized: boolean;
  setUserInitialized: React.Dispatch<React.SetStateAction<boolean>>;
  completeOTPLogin: (args: OTPAuthArgs) => Promise<void>;
  validateSession: () => Promise<null | boolean>;
  resetUser: () => void;
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

type FinalizeAuthenticationArgs = {
  stamper: TStamper;
  turnkeySessionData: TurnkeySessionData;
};

interface OTPAuthArgs {
  otpId: string;
  otpCode: string;
}

// AuthProvider component to provide the context
export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [user, setUser] = useState<UserObject>(defaultUser);
  const [jwt, setJwt] = useState<string>('');
  const [userInitialized, setUserInitialized] = useState<boolean>(false);
  const { clientId, redirectUri, utm } = useDevCredentials();
  const { setUiState, entryState } = useUIManager();

  const resetUser = () => {
    setUser(defaultUser);
  };

  const loginToDIMO = async ({
    stamper,
    turnkeySessionData,
  }: FinalizeAuthenticationArgs) => {
    if (!user.subOrganizationId) {
      throw new Error('User has not been initialized yet');
    }

    const { accessToken, walletAddress, smartContractAddress, turnkeySessionExpiration } =
      await authenticateUser(clientId, redirectUri, user.subOrganizationId, stamper);

    const updatedUserObject: UserObject = {
      ...user,
      walletAddress,
      smartContractAddress,
    };

    setJwt(accessToken);
    setUser(updatedUserObject);

    createSession({
      clientId,
      jwt: accessToken,
      user: updatedUserObject,
      turnkeySessionData: { ...turnkeySessionData, expiresAt: turnkeySessionExpiration },
    });

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

  const completePasskeyLogin = async () => {
    await loginToDIMO({
      stamper: passkeyStamper,
      turnkeySessionData: { sessionType: 'passkey' },
    });
  };

  const completeOTPLogin = async (args: OTPAuthArgs) => {
    if (!user.email || !user.subOrganizationId) {
      throw new Error('User has not been initialized yet');
    }
    const keyPair = generateP256KeyPair();
    const { credentialBundle } = await verifyOtp({
      email: user.email,
      otpCode: args.otpCode,
      otpId: args.otpId,
      key: keyPair.publicKeyUncompressed,
    });
    const apiKeyStamper = getApiKeyStamper({
      credentialBundle,
      embeddedKey: keyPair.privateKey,
    });
    await loginToDIMO({
      stamper: apiKeyStamper,
      turnkeySessionData: {
        embeddedKey: keyPair.privateKey,
        credentialBundle,
        sessionType: 'api_key',
      },
    });
  };

  const validateSession = async () => {
    const turnkeySessionData =
      getFromLocalStorage<TurnkeySessionDataWithExpiry>(TurnkeySessionKey);
    if (!user.subOrganizationId || !turnkeySessionData) {
      setUiState(UiStates.EMAIL_INPUT);
      return null;
    }
    if (getKernelSigner().hasActiveSession()) {
      return true;
    }
    if (turnkeySessionData.sessionType === 'passkey') {
      await initializePasskey(user.subOrganizationId);
      updateTurnkeySession({
        sessionType: 'passkey',
        expiresAt: getKernelSigner().passkeySessionClient.expires,
      });
      return true;
    }
    if (turnkeySessionData.expiresAt < Date.now()) {
      removeFromLocalStorage(TurnkeySessionKey);
      setUiState(UiStates.OTP_INPUT);
      return null;
    }
    const apiKeyStamper = getApiKeyStamper({
      credentialBundle: turnkeySessionData.credentialBundle,
      embeddedKey: turnkeySessionData.embeddedKey,
    });
    await getKernelSigner().openSessionWithApiStamper(
      user.subOrganizationId,
      apiKeyStamper,
    );
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        completePasskeyLogin,
        user,
        setUser,
        jwt,
        setJwt,
        userInitialized,
        setUserInitialized,
        completeOTPLogin,
        validateSession,
        resetUser,
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
