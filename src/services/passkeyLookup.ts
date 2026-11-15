/**
 * passkeyLookup.ts
 *
 * "Sign in with a passkey" without typing an email: the browser signs a
 * challenge from the accounts API with any of this site's passkeys, and the
 * accounts API returns the account only once it has verified that signature
 * against the passkey it has on record. Native fetch and WebAuthn only,
 * nothing from `buffer`, Turnkey or the wallet stack; the email form loads it
 * when it shows (usePasskeyChallenge).
 */
import type { UserObject } from '../models/user';
import { base64UrlToBytes, bytesToBase64Url } from '../utils/base64url';
import { fetchWithTimeout } from '../utils/withTimeout';
import { DIMO_ACCOUNTS_BASE_URL } from './accountsBaseUrl';

// As long as the passkey sign-in screen waits for its prompt.
const PASSKEY_PROMPT_TIMEOUT_MS = 60_000;
// How long each request may take before it is aborted (an AbortError).
const CHALLENGE_TIMEOUT_MS = 10_000;
const LOOKUP_TIMEOUT_MS = 15_000;

/** A challenge to sign, good until expiresAt (ISO). */
export type PasskeyChallenge = { challenge: string; expiresAt: string };

/** A passkey's signature over a challenge, base64url throughout. */
export type PasskeyAssertion = {
  id: string;
  response: { clientDataJSON: string; authenticatorData: string; signature: string };
};

export const fetchPasskeyChallenge = async (): Promise<PasskeyChallenge> => {
  const response = await fetchWithTimeout(
    `${DIMO_ACCOUNTS_BASE_URL}/account/passkey-challenge`,
    { method: 'GET', cache: 'no-store' },
    CHALLENGE_TIMEOUT_MS,
  );
  if (!response.ok) throw new Error(`No passkey challenge (${response.status})`);
  return response.json();
};

/**
 * Asks for any of this site's passkeys (none named, so the browser offers
 * them all) to sign the challenge. Rejects with the prompt's DOMException
 * when it is closed or times out (NotAllowedError, AbortError).
 */
export const getPasskeyAssertion = async (
  challenge: string,
): Promise<PasskeyAssertion> => {
  const credential = (await navigator.credentials.get({
    publicKey: {
      rpId: process.env.REACT_APP_RPCID_URL,
      challenge: base64UrlToBytes(challenge),
      allowCredentials: [],
      userVerification: 'preferred',
      timeout: PASSKEY_PROMPT_TIMEOUT_MS,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error('No passkey was used');
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    response: {
      clientDataJSON: bytesToBase64Url(response.clientDataJSON),
      authenticatorData: bytesToBase64Url(response.authenticatorData),
      signature: bytesToBase64Url(response.signature),
    },
  };
};

/**
 * The account the assertion proves, or null when the accounts API doesn't
 * recognise the passkey (it answers every unknown or unverified one alike).
 */
export const findAccountByPasskey = async (
  challenge: string,
  credential: PasskeyAssertion,
): Promise<UserObject | null> => {
  const response = await fetchWithTimeout(
    `${DIMO_ACCOUNTS_BASE_URL}/account/by-passkey`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge, credential }),
    },
    LOOKUP_TIMEOUT_MS,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      typeof data?.error === 'string' ? data.error : 'Could not look up the passkey',
    );
  }
  const body = await response.json();
  // Only a verified account with its sub-organization can sign in next.
  const { email, subOrganizationId, hasPasskey, emailVerified } = body ?? {};
  if (
    typeof email !== 'string' ||
    !email ||
    typeof subOrganizationId !== 'string' ||
    !subOrganizationId ||
    emailVerified !== true
  ) {
    throw new Error('The passkey lookup answered without a usable account');
  }
  return {
    email,
    subOrganizationId,
    hasPasskey: hasPasskey === true,
    emailVerified,
    smartContractAddress: null,
    walletAddress: null,
  };
};
