/***
 * This service handles all authentication-related API requests. Primarily through the dimo Auth API
 *
 * Functions:
 * - Generating Challenges
 * - Verifying Challenges
 *
 * Usage:
 * This service should be imported and called from components or hooks that handle authentication logic.
 */

import {
  GenerateChallengeResult,
  SubmitChallengeResult,
} from '@models/resultTypes';
import {
  GenerateChallengeParams,
  SubmitChallengeParams,
  SubmitCodeExchangeParams,
} from '@models/web3';

const DIMO_AUTH_BASE_URL = process.env.REACT_APP_DIMO_AUTH_URL;

export const generateChallenge = async ({
  clientId,
  domain,
  scope,
  address,
}: GenerateChallengeParams): Promise<GenerateChallengeResult> => {
  try {
    const queryParams = new URLSearchParams({
      client_id: clientId,
      domain: domain,
      scope: scope,
      response_type: 'code',
      address: address,
    });

    const response = await fetch(
      `${DIMO_AUTH_BASE_URL}/auth/web3/generate_challenge`,
      {
        method: 'POST', // Changed to GET since we are passing query params
        body: queryParams,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to generate challenge',
      };
    }

    const data = await response.json();
    return { success: true, data: data };
  } catch (error) {
    console.error('Error generating challenge:', error);
    return {
      success: false,
      error: 'An error occurred while generating challenge',
    };
  }
};

export const submitWeb3Challenge = async ({
  clientId,
  state,
  domain,
  signature,
}: SubmitChallengeParams): Promise<SubmitChallengeResult> => {
  try {
    const formBody = new URLSearchParams({
      client_id: clientId,
      state: state,
      grant_type: 'authorization_code',
      domain: domain,
      signature: signature,
    });

    const response = await fetch(
      `${DIMO_AUTH_BASE_URL}/auth/web3/submit_challenge`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to submit challenge',
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error submitting web3 challenge:', error);
    return {
      success: false,
      error: 'An error occurred while submitting challenge',
    };
  }
};

export const submitCodeExchange = async ({
  clientId,
  code,
  redirectUri,
}: SubmitCodeExchangeParams): Promise<SubmitChallengeResult> => {
  try {
    const formBody = new URLSearchParams({
      client_id: clientId,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const response = await fetch(`${DIMO_AUTH_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to submit challenge',
      };
    }

    const data = await response.json();
    return { success: true, data: { access_token: data.access_token } };
  } catch (error) {
    console.error('Error submitting web3 challenge:', error);
    return {
      success: false,
      error: 'An error occurred while submitting challenge',
    };
  }
};
