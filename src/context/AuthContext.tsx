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
  /** Sign in as this account instead of the current user state. */
  account?: UserObject;
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

  const loginToDIMO = async ({
    account = user,
    steps,
    stamper,
    turnkeySessionData,
  }: FinalizeAuthenticationArgs) => {
    if (!account.subOrganizationId) {
      throw new Error('User has not been initialized yet');
    }

    const { accessToken, walletAddress, smartContractAddress, turnkeySessionExpiration } =
      await steps.authenticateUser(
        clientId,
        redirectUri,
        account.subOrganizationId,
        stamper,
      );

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
    const turnkeySessionData = user.subOrganizationId
      ? getWalletSession(user.subOrganizationId, clientId)
      : null;
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
      setWalletSession(user.subOrganizationId, {
        sessionType: 'passkey',
        expiresAt: steps.getKernelSigner().passkeySessionClient.expires,
      });
      return true;
    }
    if (turnkeySessionData.expiresAt < Date.now()) {
      clearWalletSession(user.subOrganizationId);
      setUiState(UiStates.OTP_INPUT);
      return null;
    }
    const apiKeyStamper = steps.getApiKeyStamper({
      credentialBundle: turnkeySessionData.credentialBundle,
      embeddedKey: turnkeySessionData.embeddedKey,
    });
    try {
      await steps
        .getKernelSigner()
        .openSessionWithApiStamper(user.subOrganizationId, apiKeyStamper);
    } catch {
      // The key was revoked or expired elsewhere: a new code is the way back in.
      clearWalletSession(user.subOrganizationId);
      setUiState(UiStates.OTP_INPUT);
      return null;
    }
    return true;
  };

  const resumeAccount = async (account: RememberedAccount) => {
    const { subOrganizationId } = account;
    if (!subOrganizationId) return false;
    const session = getWalletSession(subOrganizationId, clientId);
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
    try {
      const steps = await signInStepsWithSigner();
      const stamper = steps.getApiKeyStamper({
        credentialBundle: session.credentialBundle,
        embeddedKey: session.embeddedKey,
      });
      await loginToDIMO({
        account: resumed,
        steps,
        stamper,
        turnkeySessionData: {
          sessionType: 'api_key',
          credentialBundle: session.credentialBundle,
          embeddedKey: session.embeddedKey,
        },
      });
      return true;
    } catch {
      clearWalletSession(subOrganizationId);
      return false;
    }
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
