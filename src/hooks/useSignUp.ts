import { useRef } from 'react';

import { SignUpDraft, useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { useUIManager } from '../context/UIManagerContext';
import { UiStates } from '../enums';
import {
  AccountVerifyError,
  createAccount,
  fetchUserDetails,
  registerAccount,
  verifyAccountEmail,
} from '../services/accountsService';
import { loadSignInSteps } from '../services/walletLoader';

// Shared across every useSignUp() instance (routing hook, code screen,
// passkey screen), which a per-instance ref would not be.
let startSeq = 0; // bumped by each start(); late responses from older ones are dropped
let finishing: Promise<'done' | 'code_rejected'> | null = null; // in-flight finish()

/**
 * Owns the whole sign-up sequence: send a code (or take a provider token as
 * proof of the email), make the passkey, then create/verify the account.
 * Screens only call it. The wallet stack is loaded on demand so it stays off
 * the first screen's import path.
 */
export const useSignUp = () => {
  const { signUpDraft, setSignUpDraft, setUser } = useAuthContext();
  const { setUiState } = useUIManager();
  const { apiKey } = useDevCredentials();

  // Mirrors the draft so a call right after another one sees its write,
  // which React state in the same tick would not show.
  const draftRef = useRef<SignUpDraft | null>(signUpDraft);
  draftRef.current = signUpDraft;

  const commit = (next: SignUpDraft | null) => {
    draftRef.current = next;
    setSignUpDraft(next);
  };

  const requireDraft = (): SignUpDraft => {
    const draft = draftRef.current;
    if (!draft) throw new Error('No sign-up in progress');
    return draft;
  };

  const requireCodeDraft = () => {
    const draft = requireDraft();
    if (!draft.key || !draft.otpId) throw new Error('Sign-up is not waiting for an email code');
    return { ...draft, key: draft.key };
  };

  const start = async (email: string, proofToken?: string): Promise<void> => {
    const token = ++startSeq;
    if (proofToken) {
      commit({ email, proofToken });
      setUiState(UiStates.PASSKEY_GENERATOR, { setBack: true });
      return;
    }
    const { generateP256KeyPair } = await loadSignInSteps();
    const key = generateP256KeyPair();
    const { otpId } = await registerAccount(email, key.publicKeyUncompressed);
    if (token !== startSeq) return;
    commit({ email, otpId, key });
    setUiState(UiStates.SIGNUP_VERIFY_EMAIL, { setBack: true });
  };

  const resend = async (): Promise<void> => {
    const draft = requireCodeDraft();
    const token = startSeq;
    const { otpId } = await registerAccount(draft.email, draft.key.publicKeyUncompressed);
    if (token !== startSeq) return;
    commit({ ...draft, otpId, otpCode: undefined });
  };

  const submitCode = (otpCode: string): void => {
    commit({ ...requireCodeDraft(), otpCode });
    setUiState(UiStates.PASSKEY_GENERATOR, { setBack: true });
  };

  // A second call while one is running gets the same result, so a double tap
  // cannot make two passkeys or submit twice.
  const finish = (): Promise<'done' | 'code_rejected'> => {
    if (!finishing) {
      finishing = runFinish().finally(() => {
        finishing = null;
      });
    }
    return finishing;
  };

  const runFinish = async (): Promise<'done' | 'code_rejected'> => {
    const token = startSeq;
    let draft = requireDraft();
    if (!draft.passkey) {
      const { createPasskey } = await loadSignInSteps();
      // Kept in the draft before any network call, so a retry reuses it.
      draft = { ...(draftRef.current ?? draft), passkey: await createPasskey(draft.email) };
      commit(draft);
    }
    const [attestation, challenge] = draft.passkey!;

    if (draft.proofToken) {
      await createAccount({
        email: draft.email,
        apiKey,
        attestation,
        challenge,
        deployAccount: true,
        proofToken: draft.proofToken,
      });
    } else {
      const { otpId, otpCode, key } = draft;
      if (!otpId || !otpCode || !key) throw new Error('Sign-up is missing its email code');
      try {
        await verifyAccountEmail({
          email: draft.email,
          otpId,
          otpCode,
          key: key.publicKeyUncompressed,
          attestation,
          challenge,
        });
      } catch (error) {
        if (!(error instanceof AccountVerifyError)) throw error;
        const current = draftRef.current;
        // Only touch the draft and screen if this sign-up is still the live one.
        if (token === startSeq && current && current.email === draft.email) {
          commit({ ...current, otpCode: undefined });
          setUiState(UiStates.SIGNUP_VERIFY_EMAIL);
        }
        return 'code_rejected';
      }
    }

    const user = await fetchUserDetails(draft.email);
    if (!user) throw new Error('Account not found after sign-up');
    setUser(user);
    commit(null);
    setUiState(UiStates.PASSKEY_LOGIN);
    return 'done';
  };

  return { start, resend, submitCode, finish };
};
