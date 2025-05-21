/**
 * accountsService.ts
 *
 * This service handles all requests related to the Dimo Accounts API, including
 * checking account existence and creating/linking accounts.
 * This service should only be called by AuthContext, or other Contexts
 *
 */

import { CreateAccountParams } from '../models/account';
import { CredentialResult, OtpResult, UserResult } from '../models/resultTypes';
import { generateTargetPublicKey } from '../utils/cryptoUtils';
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
    console.log(errorData);
    if (errorData.error === 'User not found') {
      return { success: false, error: 'User not found' };
    }
    throw new Error('Failed to send OTP');
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

// src/services/authService.ts
export const fetchUserDetails = async (email: string): Promise<UserResult> => {
  try {
    const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account/${email}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to fetch user details',
      };
    }

    const { subOrganizationId, hasPasskey } = await response.json(); //This is to mock the wallet address and smart contract address not being returned

    //Partial Construction of User Object, completed post connect
    const userResponse = {
      email,
      subOrganizationId,
      hasPasskey,
      smartContractAddress: '',
      walletAddress: '',
      emailVerified: true,
    };

    return { success: true, data: { user: userResponse } };
  } catch (error) {
    console.error('Error fetching user details:', error);
    return {
      success: false,
      error: 'An error occurred while fetching user details',
    };
  }
};
