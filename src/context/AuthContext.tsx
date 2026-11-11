/**
 * AuthContext.tsx
 *
 * This file provides the AuthContext and AuthProvider, which manage global authentication
 * state in the application. It can be used to store and access the user's authentication
 * status, user data, and login/logout functions across the entire application.
 *
 * Context: the signed-in user and JWT, and the sign-in steps the screens call
 * (beginning and completing a passkey or email-code login, creating an
 * account), plus validateSession for screens that sign.
 *
 * Usage:
 * Wrap the application or a part of it with the AuthProvider to make the authentication
 * state available across the app. Use the useAuthContext hook to access the authentication
 * state and functions.

 */

import React, { createContext, ReactNode, useContext, useState } from 'react';

import {
  createSession,
  handlePostAuthUIState,
  TStamper,
  updateTurnkeySession,
} from '../utils/authUtils';
import { useDevCredentials } from './DevCredentialsContext';
import { UserObject } from '../models/user';
import type { PasskeyCreationResult } from '../models/resultTypes';
import { UiStates } from '../enums';
import { useUIManager } from './UIManagerContext';
import type {
  TurnkeySessionData,
  TurnkeySessionDataWithExpiry,
} from '../services/turnkeyService';
import {
  getFromLocalStorage,
  removeFromLocalStorage,
  TurnkeySessionKey,
} from '../services/storageService';
import { verifyOtp } from '../services/accountsService';
import { signInStepsWithSigner, type SignInSteps } from '../services/walletLoader';

export type SignUpDraft = {
  email: string;
  /** Email-code path. */
  otpId?: string;
  key?: { publicKeyUncompressed: string; privateKey: string };
  otpCode?: string;
  /** Google/Apple path: the provider's token, proof of the email. */
  proofToken?: string;
  /** [attestation, challenge], kept so a retry reuses the passkey. */
  passkey?: PasskeyCreationResult;
};

interface AuthContextProps {
  completePasskeyLogin: () => Promise<void>;
  user: UserObject;
  setUser: React.Dispatch<React.SetStateAction<UserObject>>;
  jwt: string;
  setJwt: React.Dispatch<React.SetStateAction<string>>;
  completeOTPLogin: (args: OTPAuthArgs) => Promise<void>;
  validateSession: () => Promise<null | boolean>;
  resetUser: () => void;
  signUpDraft: SignUpDraft | null;
  setSignUpDraft: React.Dispatch<React.SetStateAction<SignUpDraft | null>>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

//This will be set on account creation partially, and completed on wallet connection
const defaultUser: UserObject = {
  email: '',
  smartContractAddress: '0x',
  subOrganizationId: '',
  hasPasskey: false,
  walletAddress: '0x',
  emailVerified: false,
};

type FinalizeAuthenticationArgs = {
  /** The sign-in steps the caller already waited for, signer included. */
  steps: SignInSteps;
  stamper: TStamper;
  turnkeySessionData: TurnkeySessionData;
};

interface OTPAuthArgs {
  otpId: string;
  otpCode: string;
}

// AuthProvider component to provide the context
export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element => {
  const [user, setUser] = useState<UserObject>(defaultUser);
  const [jwt, setJwt] = useState<string>('');
  const [signUpDraft, setSignUpDraft] = useState<SignUpDraft | null>(null);
  const { clientId, redirectUri, utm } = useDevCredentials();
  const { setUiState, entryState } = useUIManager();

  const resetUser = () => {
    setUser(defaultUser);
  };

  const loginToDIMO = async ({
    steps,
    stamper,
    turnkeySessionData,
  }: FinalizeAuthenticationArgs) => {
    if (!user.subOrganizationId) {
      throw new Error('User has not been initialized yet');
    }

    const { accessToken, walletAddress, smartContractAddress, turnkeySessionExpiration } =
      await steps.authenticateUser(
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
    const steps = await signInStepsWithSigner();
    await loginToDIMO({
      steps,
      stamper: steps.passkeyStamper,
      turnkeySessionData: { sessionType: 'passkey' },
    });
  };

  const completeOTPLogin = async (args: OTPAuthArgs) => {
    const steps = await signInStepsWithSigner();
    if (!user.email || !user.subOrganizationId) {
      throw new Error('User has not been initialized yet');
    }
    const keyPair = steps.generateP256KeyPair();
    const { credentialBundle } = await verifyOtp({
      email: user.email,
      otpCode: args.otpCode,
      otpId: args.otpId,
      key: keyPair.publicKeyUncompressed,
    });
    const apiKeyStamper = steps.getApiKeyStamper({
      credentialBundle,
      embeddedKey: keyPair.privateKey,
    });
    await loginToDIMO({
      steps,
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
    // A returning session can open straight onto a signing screen, before the
    // kernel signer DevCredentialsContext started is ready.
    const steps = await signInStepsWithSigner();
    if (steps.getKernelSigner().hasActiveSession()) {
      return true;
    }
    if (turnkeySessionData.sessionType === 'passkey') {
      await steps.initializePasskey(user.subOrganizationId);
      updateTurnkeySession({
        sessionType: 'passkey',
        expiresAt: steps.getKernelSigner().passkeySessionClient.expires,
      });
      return true;
    }
    if (turnkeySessionData.expiresAt < Date.now()) {
      removeFromLocalStorage(TurnkeySessionKey);
      setUiState(UiStates.OTP_INPUT);
      return null;
    }
    const apiKeyStamper = steps.getApiKeyStamper({
      credentialBundle: turnkeySessionData.credentialBundle,
      embeddedKey: turnkeySessionData.embeddedKey,
    });
    await steps
      .getKernelSigner()
      .openSessionWithApiStamper(user.subOrganizationId, apiKeyStamper);
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
        completeOTPLogin,
        validateSession,
        resetUser,
        signUpDraft,
        setSignUpDraft,
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
