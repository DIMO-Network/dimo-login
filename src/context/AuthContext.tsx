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
import React, { createContext, ReactNode, useContext, useRef, useState } from 'react';

import { createSession, handlePostAuthUIState, TStamper } from '../utils/authUtils';
import { useDevCredentials } from './DevCredentialsContext';
import { UserObject } from '../models/user';
import { UiStates } from '../enums';
import { useUIManager } from './UIManagerContext';
import type { TurnkeySessionData } from '../services/turnkeyService';
import {
  clearWalletSession,
  getRememberedAccounts,
  getWalletSession,
  setWalletSession,
  type RememberedAccount,
} from '../services/accountStore';
import { clearSessionData } from '../services/storageService';
import { verifyOtp } from '../services/accountsService';
import { shouldOfferPasskey } from '../services/passkeyOffer';
import { signInStepsWithSigner, type SignInSteps } from '../services/walletLoader';
import { useSignUpFlow, type SignUp, type SignUpDraft } from '../hooks/useSignUpFlow';
import type { AccountRequest } from '../utils/loginPrompt';
import { PasskeyOffer } from '../screens';
import { base64UrlToBytes } from '../utils/base64url';
import { signInNoticeEnabled } from '../utils/featureFlags';
import { sendSignInNotice } from '../services/signInNotice';

/** The passkey "Sign in with a passkey" found, for the account it belongs to. */
export type PasskeyHint = { credentialId: string; subOrganizationId: string };

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
  /**
   * Drop the user and any sign-up in progress and open the email screen on its
   * email form, not the chooser ("Use my email instead").
   */
  openEmailForm: () => void;
  /** Set by openEmailForm until the email screen has read it (clearEmailFormIntent). */
  emailFormIntent: boolean;
  clearEmailFormIntent: () => void;
  /**
   * Goes on from the passkey offer to where the email-code sign-in was going.
   * Runs that once; later calls do nothing.
   */
  continueAfterSignIn: () => void;
  /**
   * Pins the next passkey sign-in, for that account only, to the passkey that
   * "Sign in with a passkey" found, so its prompt goes straight to that
   * passkey. Used once; dropped by resetUser and switchAccount.
   */
  setPasskeyHint: (hint: PasskeyHint | null) => void;
  /**
   * What the app asked of the sign-in (prompt, loginHint), until someone signs
   * in on this page; empty from then on, switchAccount included. Read it here,
   * not from the app's parameters.
   */
  accountRequest: AccountRequest;
  /** The sign-up in progress, if any. */
  signUpDraft: SignUpDraft | null;
  /** The sign-up sequence; screens reach it through useSignUp(). */
  signUp: SignUp;
}

/** What Sentry gets when a stored wallet session fails: fixed text, nothing from the caught error. */
const storedSessionError = () => new Error('Stored wallet session could not be used');

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
  const { clientId, redirectUri, utm, prompt, loginHint } = useDevCredentials();
  const { setUiState, setError, entryState } = useUIManager();
  const { draft: signUpDraft, clearDraft, signUp } = useSignUpFlow({ setUser });

  // The app's prompt and loginHint are about the sign-in that opens this page.
  // Once someone has signed in here (a cached session used at the start
  // counts), they are spent for the rest of the page: "Use another account"
  // then offers every account and may resume one silently.
  const [signedInHere, setSignedInHere] = useState(false);
  if (jwt && !signedInHere) setSignedInHere(true);
  const accountRequest: AccountRequest = signedInHere ? {} : { prompt, loginHint };

  // Where an email-code sign-in goes once the passkey offer is answered.
  const afterSignInRef = useRef<(() => void) | null>(null);
  const passkeyHintRef = useRef<PasskeyHint | null>(null);
  const setPasskeyHint = (hint: PasskeyHint | null) => {
    passkeyHintRef.current = hint;
  };

  const resetUser = () => {
    setUser(defaultUser);
    clearDraft();
    afterSignInRef.current = null;
    passkeyHintRef.current = null;
  };

  const [emailFormIntent, setEmailFormIntent] = useState(false);
  const openEmailForm = () => {
    resetUser();
    setError(null);
    setEmailFormIntent(true);
    setUiState(UiStates.EMAIL_INPUT);
  };
  const clearEmailFormIntent = () => setEmailFormIntent(false);

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

  /**
   * Signs this app in as the account once authenticate has succeeded, then
   * goes where the sign-in was going, or hands that step to `holdFor` (the
   * passkey offer) to run later. `resumed`: a silent resume from the chooser.
   */
  const completeLogin = (
    account: UserObject,
    {
      accessToken,
      walletAddress,
      smartContractAddress,
      turnkeySessionExpiration,
    }: Awaited<ReturnType<typeof authenticate>>,
    turnkeySessionData: TurnkeySessionData,
    {
      holdFor,
      resumed = false,
    }: { holdFor?: (proceed: () => void) => void; resumed?: boolean } = {},
  ) => {
    const updatedUserObject: UserObject = {
      ...account,
      walletAddress,
      smartContractAddress,
    };
    // The account's credential IDs stay in memory.
    const { credentialIds, ...storedUser } = updatedUserObject;

    // Read before createSession remembers the account: a first sign-in on this
    // browser (never a silent resume) tells the accounts API, which decides
    // whether to email the account.
    const firstHere =
      !resumed &&
      signInNoticeEnabled() &&
      !getRememberedAccounts(null).some(
        (remembered) => remembered.email === account.email.trim().toLowerCase(),
      );

    afterSignInRef.current = null;
    setJwt(accessToken);
    setUser(updatedUserObject);

    createSession({
      clientId,
      jwt: accessToken,
      user: storedUser,
      turnkeySessionData: { ...turnkeySessionData, expiresAt: turnkeySessionExpiration },
    });
    if (firstHere) sendSignInNotice(accessToken);

    const proceed = () =>
      handlePostAuthUIState({
        entryState,
        clientId,
        redirectUri,
        utm,
        setUiState,
        user: updatedUserObject,
        jwt: accessToken,
      });
    if (holdFor) holdFor(proceed);
    else proceed();
  };

  /** Whether to show the passkey offer: its screen must load, or the sign-in would stall. */
  const offersPasskey = async (account: UserObject) => {
    try {
      if (!(await shouldOfferPasskey(account))) return false;
      await PasskeyOffer.preload();
      return true;
    } catch {
      return false;
    }
  };

  const holdForPasskeyOffer = (proceed: () => void) => {
    afterSignInRef.current = proceed;
    setUiState(UiStates.PASSKEY_OFFER);
  };

  const continueAfterSignIn = () => {
    const proceed = afterSignInRef.current;
    afterSignInRef.current = null;
    proceed?.();
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
    // The page's one passkey stamper is pinned only for this sign-in, and only
    // to this account's hinted passkey: a pin never outlives the call, so it
    // can't steer another account's prompt. The hint is used up either way.
    const hint = passkeyHintRef.current;
    passkeyHintRef.current = null;
    const { passkeyStamper } = steps;
    passkeyStamper.allowCredentials =
      hint && hint.subOrganizationId === user.subOrganizationId
        ? [{ id: base64UrlToBytes(hint.credentialId), type: 'public-key' }]
        : [];
    try {
      await loginToDIMO({
        steps,
        stamper: passkeyStamper,
        turnkeySessionData: { sessionType: 'passkey' },
      });
    } finally {
      passkeyStamper.allowCredentials = [];
    }
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
    const result = await authenticate(user, steps, apiKeyStamper);
    // Only here: never after a passkey sign-in or a silent resume.
    const offer = await offersPasskey(user);
    completeLogin(
      user,
      result,
      { embeddedKey: keyPair.privateKey, credentialBundle, sessionType: 'api_key' },
      { holdFor: offer ? holdForPasskeyOffer : undefined },
    );
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
    } catch {
      // Any failure of the key costs one more code; report that it happened so a
      // pattern shows. Never the caught error: a key that isn't valid hex is
      // quoted in its message.
      captureException(storedSessionError());
      // The key can't be read, or was revoked or expired elsewhere: a new code
      // is the way back in.
      clearWalletSession(subOrganizationId);
      setUiState(UiStates.OTP_INPUT);
      return null;
    }
    return true;
  };

  const resumeAccount = async (account: RememberedAccount) => {
    // The app wants a fresh sign-in: the person passes the passkey or code step.
    if (accountRequest.prompt === 'login') return false;
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
    } catch {
      // Only the key failing means "no silent sign-in". Report a fixed error, not
      // the caught one: its message can quote the stored key.
      captureException(storedSessionError());
      clearWalletSession(subOrganizationId);
      return false;
    }
    // Past this point the person is signed in: a failure here is not a failed resume.
    completeLogin(resumed, result, turnkeySessionData, { resumed: true });
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
        openEmailForm,
        emailFormIntent,
        clearEmailFormIntent,
        continueAfterSignIn,
        setPasskeyHint,
        accountRequest,
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
