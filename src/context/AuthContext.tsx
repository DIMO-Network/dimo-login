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

import { captureException } from '@sentry/react';
import React, { createContext, ReactNode, useContext, useState } from 'react';

import { createSession, handlePostAuthUIState, TStamper } from '../utils/authUtils';
import { useDevCredentials } from './DevCredentialsContext';
import { UserObject } from '../models/user';
import { UiStates } from '../enums';
import { useUIManager } from './UIManagerContext';
import type { TurnkeySessionData } from '../services/turnkeyService';
import {
  clearWalletSession,
  getWalletSession,
  setWalletSession,
  type RememberedAccount,
} from '../services/accountStore';
import { clearSessionData } from '../services/storageService';
import { verifyOtp } from '../services/accountsService';
import { signInStepsWithSigner, type SignInSteps } from '../services/walletLoader';
import { useSignUpFlow, type SignUp, type SignUpDraft } from '../hooks/useSignUpFlow';

interface AuthContextProps {
  completePasskeyLogin: () => Promise<void>;
  user: UserObject;
  setUser: React.Dispatch<React.SetStateAction<UserObject>>;
  jwt: string;
  setJwt: React.Dispatch<React.SetStateAction<string>>;
  completeOTPLogin: (args: OTPAuthArgs) => Promise<void>;
  validateSession: () => Promise<null | boolean>;
  resetUser: () => void;
  /**
   * Sign in as a remembered account from its live email-code session, without a
   * prompt. False (nothing changed) when there is no such session; call it only
   * from the person's click on that account.
   */
  resumeAccount: (account: RememberedAccount) => Promise<boolean>;
  /** Sign this app out and open sign-in; the account's wallet session stays. */
  switchAccount: () => void;
  /** The sign-up in progress, if any. */
  signUpDraft: SignUpDraft | null;
  /** The sign-up sequence; screens reach it through useSignUp(). */
  signUp: SignUp;
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
  const { clientId, redirectUri, utm } = useDevCredentials();
  const { setUiState, setError, entryState } = useUIManager();
  const { draft: signUpDraft, clearDraft, signUp } = useSignUpFlow({ setUser });

  const resetUser = () => {
    setUser(defaultUser);
    clearDraft();
  };

  /** Proves the stamper's key works and mints this app's token. */
  const authenticate = async (
    account: UserObject,
    steps: SignInSteps,
    stamper: TStamper,
  ) => {
    // The page has one signer, and it keeps the last account's sessions: a live
    // passkey session even skips the next prompt and signs as that account. So
    // every sign-in starts from a clean one, which the steps below set up again.
    steps.getKernelSigner().resetClient();
    if (!account.subOrganizationId) {
      throw new Error('User has not been initialized yet');
    }
    return steps.authenticateUser(
      clientId,
      redirectUri,
      account.subOrganizationId,
      stamper,
    );
  };

  /** Signs this app in as the account once authenticate has succeeded. */
  const completeLogin = (
    account: UserObject,
    {
      accessToken,
      walletAddress,
      smartContractAddress,
      turnkeySessionExpiration,
    }: Awaited<ReturnType<typeof authenticate>>,
    turnkeySessionData: TurnkeySessionData,
  ) => {
    const updatedUserObject: UserObject = {
      ...account,
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

  const loginToDIMO = async ({
    steps,
    stamper,
    turnkeySessionData,
  }: FinalizeAuthenticationArgs) => {
    const result = await authenticate(user, steps, stamper);
    completeLogin(user, result, turnkeySessionData);
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
    const { subOrganizationId } = user;
    if (!subOrganizationId) {
      setUiState(UiStates.EMAIL_INPUT);
      return null;
    }
    const turnkeySessionData = getWalletSession(subOrganizationId);
    if (!turnkeySessionData) {
      setUiState(UiStates.EMAIL_INPUT);
      return null;
    }
    // A returning session can open straight onto a signing screen, before the
    // kernel signer DevCredentialsContext started is ready.
    const steps = await signInStepsWithSigner();
    const signer = steps.getKernelSigner();
    // A signer still holding another account's session must not sign for this one.
    if (signer.subOrganizationId !== subOrganizationId) {
      signer.resetClient();
    }
    if (signer.hasActiveSession()) {
      return true;
    }
    if (turnkeySessionData.sessionType === 'passkey') {
      await steps.initializePasskey(subOrganizationId);
      setWalletSession(subOrganizationId, {
        sessionType: 'passkey',
        expiresAt: signer.passkeySessionClient.expires,
      });
      return true;
    }
    if (turnkeySessionData.expiresAt < Date.now()) {
      clearWalletSession(subOrganizationId);
      setUiState(UiStates.OTP_INPUT);
      return null;
    }
    try {
      const apiKeyStamper = steps.getApiKeyStamper({
        credentialBundle: turnkeySessionData.credentialBundle,
        embeddedKey: turnkeySessionData.embeddedKey,
      });
      await signer.openSessionWithApiStamper(subOrganizationId, apiKeyStamper);
    } catch (error) {
      // Any failure of the key costs one more code; report it so a pattern shows.
      captureException(error);
      // The key can't be read, or was revoked or expired elsewhere: a new code
      // is the way back in.
      clearWalletSession(subOrganizationId);
      setUiState(UiStates.OTP_INPUT);
      return null;
    }
    return true;
  };

  const resumeAccount = async (account: RememberedAccount) => {
    const { subOrganizationId } = account;
    if (!subOrganizationId) return false;
    const session = getWalletSession(subOrganizationId);
    if (session?.sessionType !== 'api_key' || !(session.expiresAt > Date.now())) {
      return false;
    }
    const resumed: UserObject = {
      email: account.email,
      subOrganizationId,
      hasPasskey: account.hasPasskey ?? false,
      walletAddress: account.walletAddress ?? null,
      smartContractAddress: account.smartContractAddress ?? null,
      emailVerified: true,
    };
    const steps = await signInStepsWithSigner();
    const turnkeySessionData: TurnkeySessionData = {
      sessionType: 'api_key',
      credentialBundle: session.credentialBundle,
      embeddedKey: session.embeddedKey,
    };
    let result: Awaited<ReturnType<typeof authenticate>>;
    try {
      const stamper = steps.getApiKeyStamper({
        credentialBundle: session.credentialBundle,
        embeddedKey: session.embeddedKey,
      });
      result = await authenticate(resumed, steps, stamper);
    } catch (error) {
      // Only the key failing means "no silent sign-in"; never report the key itself.
      captureException(error);
      clearWalletSession(subOrganizationId);
      return false;
    }
    // Past this point the person is signed in: a failure here is not a failed resume.
    completeLogin(resumed, result, turnkeySessionData);
    return true;
  };

  const switchAccount = () => {
    clearSessionData(clientId);
    setJwt('');
    resetUser();
    setError(null);
    setUiState(UiStates.EMAIL_INPUT);
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
        resumeAccount,
        switchAccount,
        signUpDraft,
        signUp,
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
