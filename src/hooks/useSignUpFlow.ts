import { useRef, useState } from 'react';

import { useDevCredentials } from '../context/DevCredentialsContext';
import { useUIManager } from '../context/UIManagerContext';
import { UiStates } from '../enums';
import { message } from '../i18n';
import type { PasskeyCreationResult } from '../models/resultTypes';
import type { UserObject } from '../models/user';
import {
  AccountVerifyError,
  createAccount,
  fetchUserDetails,
  registerAccount,
  verifyAccountEmail,
} from '../services/accountsService';
import { loadSignInSteps } from '../services/walletLoader';

/** A sign-up in progress. `passkey` ([attestation, challenge]) is kept so a retry reuses it. */
export type SignUpDraft =
  | {
      /** Email-code path: a code was sent to the email. */
      kind: 'code';
      email: string;
      otpId: string;
      key: { publicKeyUncompressed: string; privateKey: string };
      otpCode?: string;
      passkey?: PasskeyCreationResult;
    }
  | {
      /** Google/Apple path: the provider's token is the proof of the email. */
      kind: 'proof';
      email: string;
      proofToken: string;
      passkey?: PasskeyCreationResult;
    };

export interface SignUp {
  /** Starts a new sign-up, replacing any other: emails a code, or takes a provider token as proof. */
  start: (email: string, proofToken?: string) => Promise<void>;
  /** Emails a new code for the sign-up in progress. */
  resend: () => Promise<void>;
  /** Keeps the typed code and moves on to the passkey; the server checks it in finish. */
  submitCode: (otpCode: string) => void;
  /**
   * Makes the passkey (once) and creates or verifies the account, then moves on
   * to sign-in. A rejected code goes back to the code screen with an error and
   * resolves; any other failure rejects.
   */
  finish: () => Promise<void>;
}

/**
 * Owns the whole sign-up sequence: send a code (or take a provider token as
 * proof of the email), make the passkey, then create/verify the account.
 * Called once, by AuthProvider; screens reach it through useSignUp(). The
 * wallet stack is loaded on demand so it stays off the first screen's import
 * path.
 */
export const useSignUpFlow = ({ setUser }: { setUser: (user: UserObject) => void }) => {
  const { setUiState, setError } = useUIManager();
  const { apiKey } = useDevCredentials();
  const [draft, setDraftState] = useState<SignUpDraft | null>(null);
  // The latest draft, so a call right after another one sees its write, which
  // React state in the same tick would not show. Written only by setDraft.
  const draftRef = useRef<SignUpDraft | null>(null);
  // Bumped by each start(): work left over from an older sign-up is dropped.
  const attemptRef = useRef(0);
  // The running finish(), so a double tap cannot make two passkeys or submit twice.
  const finishingRef = useRef<{ attempt: number; promise: Promise<void> } | null>(null);

  const setDraft = (next: SignUpDraft | null) => {
    draftRef.current = next;
    setDraftState(next);
  };

  const codeDraft = () => {
    const current = draftRef.current;
    if (current?.kind !== 'code') throw new Error('No sign-up is waiting for an email code');
    return current;
  };

  const start = async (email: string, proofToken?: string): Promise<void> => {
    const attempt = ++attemptRef.current;
    if (proofToken) {
      setDraft({ kind: 'proof', email, proofToken });
      setUiState(UiStates.PASSKEY_GENERATOR, { setBack: true });
      return;
    }
    const { generateP256KeyPair } = await loadSignInSteps();
    const key = generateP256KeyPair();
    const { otpId } = await registerAccount(email, key.publicKeyUncompressed);
    if (attempt !== attemptRef.current) return;
    setDraft({ kind: 'code', email, otpId, key });
    setUiState(UiStates.SIGNUP_VERIFY_EMAIL, { setBack: true });
  };

  const resend = async (): Promise<void> => {
    const attempt = attemptRef.current;
    const draft = codeDraft();
    const { otpId } = await registerAccount(draft.email, draft.key.publicKeyUncompressed);
    if (attempt !== attemptRef.current) return;
    setDraft({ ...draft, otpId, otpCode: undefined });
  };

  const submitCode = (otpCode: string): void => {
    setDraft({ ...codeDraft(), otpCode });
    setUiState(UiStates.PASSKEY_GENERATOR, { setBack: true });
  };

  const finish = (): Promise<void> => {
    const attempt = attemptRef.current;
    if (finishingRef.current?.attempt !== attempt) {
      const promise: Promise<void> = runFinish(attempt).finally(() => {
        if (finishingRef.current?.promise === promise) finishingRef.current = null;
      });
      finishingRef.current = { attempt, promise };
    }
    return finishingRef.current.promise;
  };

  const runFinish = async (attempt: number): Promise<void> => {
    const isCurrent = () => attempt === attemptRef.current;
    const started = draftRef.current;
    if (!started) throw new Error('No sign-up in progress');

    let passkey = started.passkey;
    if (!passkey) {
      const { createPasskey } = await loadSignInSteps();
      passkey = await createPasskey(started.email);
    }
    const draft = draftRef.current;
    if (!isCurrent() || !draft) return;
    // Kept in the draft before any network call, so a retry reuses it.
    if (!draft.passkey) setDraft({ ...draft, passkey });
    const [attestation, challenge] = passkey;

    if (draft.kind === 'proof') {
      await createAccount({
        email: draft.email,
        apiKey,
        attestation,
        challenge,
        deployAccount: true,
        proofToken: draft.proofToken,
      });
    } else {
      if (!draft.otpCode) throw new Error('Sign-up is missing its email code');
      try {
        await verifyAccountEmail({
          email: draft.email,
          otpId: draft.otpId,
          otpCode: draft.otpCode,
          key: draft.key.publicKeyUncompressed,
          attestation,
          challenge,
        });
      } catch (error) {
        if (!(error instanceof AccountVerifyError)) throw error;
        if (!isCurrent()) return;
        setDraft({ ...codeDraft(), otpCode: undefined });
        setError(message('signup.error.code'));
        setUiState(UiStates.SIGNUP_VERIFY_EMAIL);
        return;
      }
    }

    const user = await fetchUserDetails(draft.email);
    if (!isCurrent()) return;
    if (!user) throw new Error('Account not found after sign-up');
    setUser(user);
    setDraft(null);
    setUiState(UiStates.PASSKEY_LOGIN);
  };

  // Ends the sign-up in progress: anything still running for it is dropped.
  const clearDraft = () => {
    attemptRef.current += 1;
    setDraft(null);
  };

  const signUp: SignUp = { start, resend, submitCode, finish };
  return { draft, clearDraft, signUp };
};
