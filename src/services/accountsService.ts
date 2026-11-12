import { CreateAccountParams } from '../models/account';
import { CredentialResult, OtpResult } from '../models/resultTypes';
import { UserObject } from '../models/user';

const DIMO_ACCOUNTS_BASE_URL =
  process.env.REACT_APP_DIMO_ACCOUNTS_URL || 'https://accounts.dev.dimo.org/api';

// Example: Send OTP using Accounts API
export const sendOtp = async (email: string): Promise<OtpResult> => {
  // Call Turnkey's OTP generation API/SDK
  //Endpoint: POST /api/auth/otp
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/auth/otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
    }),
  });

  // Handle response failure cases first
  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.error === 'User not found') {
      return { success: false, error: 'User not found' };
    }
    throw new Error(errorData?.error ?? 'Failed to send OTP');
  }

  // Parse successful response
  const responseData = await response.json();
  if (!responseData.otpId) {
    throw new Error('OTP ID not found in response');
  }

  // Return success with OTP ID
  return { success: true, data: { otpId: responseData.otpId } };
};

export const verifyOtp = async ({
  email,
  otpCode,
  otpId,
  key,
}: {
  email: string;
  otpCode: string;
  otpId: string;
  key: string;
}): Promise<CredentialResult> => {
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/auth/otp`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      otpId,
      otpCode,
      key,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? 'Unknown error trying to verify OTP');
  }

  const data = await response.json();
  if (!data.credentialBundle) {
    throw new Error('No credentialBundle included in response from server');
  }
  return data;
};

// Starts sign-up: registers the account without deploying it and emails a code.
export const registerAccount = async (
  email: string,
  key: string,
): Promise<{ otpId: string }> => {
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, key, origin: 'DIMO', deployAccount: false }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error ?? 'Failed to register account');
  }

  const { otpId } = await response.json();
  return { otpId };
};

export class AccountVerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountVerifyError';
  }
}

// Proves the email with the code and attaches the passkey in one call.
export const verifyAccountEmail = async ({
  email,
  otpId,
  otpCode,
  key,
  attestation,
  challenge,
}: {
  email: string;
  otpId: string;
  otpCode: string;
  key: string;
  attestation: object;
  challenge: string;
}): Promise<void> => {
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      otpId,
      otpCode,
      key,
      attestation,
      encodedChallenge: challenge,
      deployAccount: true,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new AccountVerifyError(data?.error ?? 'Could not verify email');
  }
};

// Function to create an account
export const createAccount = async ({
  email,
  apiKey,
  attestation,
  challenge,
  deployAccount,
  proofToken,
}: CreateAccountParams): Promise<UserObject> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (proofToken) {
    headers.Authorization = `Bearer ${proofToken}`;
  }
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      key: apiKey,
      attestation,
      encodedChallenge: challenge,
      deployAccount: deployAccount,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create account');
  }

  const { subOrganizationId, hasPasskey } = await response.json();

  return {
    email,
    subOrganizationId,
    hasPasskey,
    smartContractAddress: null,
    walletAddress: null,
    emailVerified: true,
  };
};

export const fetchUserDetails = async (email: string): Promise<null | UserObject> => {
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account/${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const data = await response.json();
    throw new Error(data.message ?? 'Failed to fetch user details');
  }
  const { subOrganizationId, hasPasskey, emailVerified, authenticators } =
    await response.json();
  return {
    email,
    subOrganizationId,
    hasPasskey,
    smartContractAddress: null,
    walletAddress: null,
    // Older API builds omit the field; treat those as verified.
    emailVerified: emailVerified !== false,
    ...(Array.isArray(authenticators) && {
      credentialIds: authenticators.map(
        (authenticator: { credentialId: string }) => authenticator.credentialId,
      ),
    }),
  };
};

/** A Turnkey request the browser stamped, for the accounts API to forward. */
export type StampedRequest = {
  url: string;
  body: string;
  stamp: { stampHeaderName: string; stampHeaderValue: string };
};

/**
 * Has the accounts API forward a stamped CREATE_AUTHENTICATORS_V2 request (a
 * passkey added with the account's own email-code session) and record the
 * passkey. The signed request is the proof: no token is sent.
 */
export const addAuthenticator = async (
  email: string,
  signedCreateAuthenticatorsRequest: StampedRequest,
): Promise<void> => {
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account/authenticator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, signedCreateAuthenticatorsRequest }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error ?? 'Could not add the passkey');
  }
};
