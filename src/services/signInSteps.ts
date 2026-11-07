/**
 * signInSteps.ts
 *
 * The wallet half of signing in: opening the Turnkey session, the kernel
 * signer, and the signed challenge that trades for a JWT. It pulls in the
 * wallet stack (viem, the transactions SDK, ZeroDev, Turnkey), so the app
 * imports it only through walletLoader, which loads it on demand. Nothing on
 * the first screen may import it statically.
 */

import { ApiKeyStamper } from '@turnkey/api-key-stamper';

import { generateChallenge, submitWeb3Challenge } from './authService';
import {
  getKernelSigner,
  getSmartContractAddress,
  getWalletAddress,
  initializePasskey,
  signChallenge,
} from './turnkeyService';
import { GenerateChallengeParams, SubmitChallengeParams } from '../models/web3';
import type { TStamper } from '../utils/authUtils';

export {
  createKernelSigner,
  getApiKeyStamper,
  getKernelSigner,
  initializePasskey,
  passkeyStamper,
} from './turnkeyService';
export { generateP256KeyPair } from '@turnkey/crypto';

async function initializeKernelClient(
  subOrganizationId: string,
  stamper: TStamper,
): Promise<{
  smartContractAddress: `0x${string}`;
  walletAddress: `0x${string}`;
  turnkeySessionExpiration: number;
}> {
  let expires: number;
  if (stamper instanceof ApiKeyStamper) {
    await getKernelSigner().openSessionWithApiStamper(subOrganizationId, stamper);
    expires = getKernelSigner().apiSessionClient.expires;
  } else {
    await initializePasskey(subOrganizationId);
    expires = getKernelSigner().passkeySessionClient.expires;
  }

  const smartContractAddress = getSmartContractAddress();
  const walletAddress = getWalletAddress();

  if (!smartContractAddress || !walletAddress) {
    throw new Error('Could not authenticate user, wallet address does not exist');
  }

  return { smartContractAddress, walletAddress, turnkeySessionExpiration: expires };
}

// Helper function to generate challenge and state
async function getChallenge({
  clientId,
  redirectUri,
  smartContractAddress,
}: {
  clientId: `0x${string}` | null;
  redirectUri: string;
  smartContractAddress: string;
}): Promise<{ challenge: string; state: string }> {
  const generateChallengeParams: GenerateChallengeParams = {
    clientId,
    domain: redirectUri,
    scope: 'openid email',
    address: smartContractAddress,
  };

  const resp = await generateChallenge(generateChallengeParams);
  if (!resp.success) {
    throw new Error(resp.error);
  }

  return { challenge: resp.data.challenge, state: resp.data.state };
}

// Helper function to submit signed challenge and return access token
async function submitSignedChallenge({
  clientId,
  redirectUri,
  signature,
  state,
}: {
  clientId: `0x${string}` | null;
  redirectUri: string;
  signature: string;
  state: string;
}): Promise<string> {
  const web3ChallengeSubmission: SubmitChallengeParams = {
    clientId,
    state,
    domain: redirectUri,
    signature,
  };

  const jwtResponse = await submitWeb3Challenge(web3ChallengeSubmission);

  if (!jwtResponse.success) {
    throw new Error('Failed to submit web3 challenge');
  }

  return jwtResponse.data.access_token;
}

export async function authenticateUser(
  clientId: `0x${string}` | null,
  redirectUri: string,
  subOrganizationId: string | null,
  stamper: TStamper,
) {
  if (!subOrganizationId) {
    throw new Error('Could not authenticate user, account not deployed');
  }
  const { smartContractAddress, walletAddress, turnkeySessionExpiration } =
    await initializeKernelClient(subOrganizationId, stamper);

  const { challenge, state } = await getChallenge({
    clientId,
    redirectUri,
    smartContractAddress,
  });

  const signature = await signChallenge(challenge);
  if (!signature) {
    throw new Error('Failed to sign challenge');
  }

  const accessToken = await submitSignedChallenge({
    clientId,
    redirectUri,
    signature,
    state,
  });

  return {
    accessToken,
    smartContractAddress,
    walletAddress,
    turnkeySessionExpiration,
  };
}
