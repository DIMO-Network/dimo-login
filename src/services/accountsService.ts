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

// Function to create an account
export const createAccount = async ({
  email,
  apiKey,
  attestation,
  challenge,
  deployAccount,
}: CreateAccountParams): Promise<UserObject> => {
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
    smartContractAddress: '',
    walletAddress: '',
    emailVerified: true,
  };
};

export const fetchUserDetails = async (email: string): Promise<null | UserObject> => {
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account/${email}`, {
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
  const { subOrganizationId, hasPasskey } = await response.json();
  return {
    email,
    subOrganizationId,
    hasPasskey,
    smartContractAddress: '',
    walletAddress: '',
    emailVerified: true,
  };
};
