/**
 * authService.ts
 * 
 * This service handles all authentication-related API requests. Primarily through the dimo Auth API
 * 
 * Functions:
 * - Generating Challenges
 * - Verifying Challenges
 * 
 * Usage:
 * This service should be imported and called from components or hooks that handle authentication logic.
 */

const DIMO_AUTH_BASE_URL = 'https://auth.dimo.zone';

export const generateChallenge = async (clientId: string, domain: string, scope: string, address: string): Promise<{ success: boolean; error?: string; data?: any }> => {
  try {
    const queryParams = new URLSearchParams({
      client_id: clientId,
      domain: domain,
      scope: scope,
      response_type: "code",
      address: address, 
    });

    const response = await fetch(`${DIMO_AUTH_BASE_URL}/auth/web3/generate_challenge`, {
      method: "POST",  // Changed to GET since we are passing query params
      body: queryParams,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Failed to generate challenge' };
    }

    const data = await response.json();
    return { success: true, data: data };
  } catch (error) {
    console.error('Error generating challenge:', error);
    return { success: false, error: 'An error occurred while generating challenge' };
  }
};


export const submitWeb3Challenge = async (
  clientId: string,
  state: string,
  domain: string,
  signature: string
): Promise<{ success: boolean; error?: string; data?: any }> => {
  try {
    // Construct the body using URLSearchParams for form-urlencoded
    const formBody = new URLSearchParams({
      client_id: clientId,
      state: state,
      grant_type: "authorization_code", // Fixed value
      domain: domain,
      signature: signature, // The 0x-prefixed signature obtained from Step 2
    });

    const response = await fetch(`${DIMO_AUTH_BASE_URL}/auth/web3/submit_challenge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody, // Send the form-encoded body
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Failed to submit challenge' };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error submitting web3 challenge:', error);
    return { success: false, error: 'An error occurred while submitting challenge' };
  }
};

