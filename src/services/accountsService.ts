/**
 * accountsService.ts
 *
 * This service handles all requests related to the Dimo Accounts API, including
 * checking account existence and creating/linking accounts.
 *
 */

import { UserObject } from "../models/user";
import { generateTargetPublicKey } from "../utils/authUtils";

const DIMO_ACCOUNTS_BASE_URL = process.env.REACT_APP_DIMO_ACCOUNTS_URL || 'https://accounts.dev.dimo.org';

// Example: Send OTP using Accounts API
export const sendOtp = async (email: string, apiKey: string): Promise<{ success: boolean, otpId?: string; error?: string }> => {
  // Call Turnkey's OTP generation API/SDK
  //Endpoint: POST /api/auth/otp
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/auth/otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      key: apiKey, //TODO: Fetch from dev props
    }),
  });

  // Handle response failure cases first
  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.error === "User not found") {
      return { success: false, error: "User not found" };
    }
    throw new Error("Failed to send OTP");
  }

  // Parse successful response
  const data = await response.json();
  if (!data.otpId) {
    throw new Error("OTP ID not found in response");
  }

  // Return success with OTP ID
  return { success: true, otpId: data.otpId };
};

// Example: Verify OTP using Accounts API
export const verifyOtp = async (
  email: string,
  otp: string,
  otpId: string
): Promise<{success: boolean, credentialBundle?: string; error?: string}> => {
  // Call Turnkey's OTP verification API/SDK
  //Endpoint: PUT /api/auth/otp
  console.log(`Verifying OTP, Email:${email}, OTP: ${otp}, OtpID: ${otpId}`);
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/auth/otp`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      otpId,
      otpCode: otp,
      key: await generateTargetPublicKey(), //TODO: Fetch from dev props
    }),
  });

  // Handle response failure cases first
  if (!response.ok) {
    throw new Error("Failed to send OTP");
  }

//   // Parse successful response
  const data = await response.json();
  if (!data.credentialBundle) {
    throw new Error("Could not retrieve credential bundle");
  }

//   // Return success with OTP ID
  return { success: true, credentialBundle: data.credentialBundle };
};

export const verifyEmail = async (
  email: string,
  encodedChallenge: string,
  attestation: object,
): Promise<{success: boolean, credentialBundle?: string; error?: string}> => {
  // Call Turnkey's OTP verification API/SDK
  //Endpoint: PUT /api/auth/otp
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account/verify-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      encodedChallenge,
      attestation,
    }),
  });

  // Handle response failure cases first
  if (!response.ok) {
    throw new Error("Failed to send OTP");
  }

//   // Return success with OTP ID
  return { success: true };
};

// Function to create an account
export const createAccount = async (
  email: string,
  apiKey: string,
  attestation?: object,
  challenge?: string,
  deployAccount?: boolean,
): Promise<{ success: boolean }> => {
  const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      key: apiKey, //TODO: Fetch from dev props
      attestation,
      encodedChallenge: challenge,
      deployAccount: deployAccount,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create account");
  }
  return { success: true };
};

// Function to deploy an account
export const deployAccount = async (email: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account/deploy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        throw new Error('Failed to deploy account');
    }
    return { success: true };
};

// src/services/authService.ts
export const fetchUserDetails = async (email: string): Promise<{ success: boolean; error?: string; user?: UserObject }> => {
  try {
    const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account/${email}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Failed to fetch user details' };
    }

    const user = await response.json();
    return { success: true, user: {...user, email} };
  } catch (error) {
    console.error('Error fetching user details:', error);
    return { success: false, error: 'An error occurred while fetching user details' };
  }
};
