import { generateChallenge, submitWeb3Challenge } from '../services/authService';
import {
  getKernelSigner,
  getSmartContractAddress,
  getWalletAddress,
  initializePasskey,
  signChallenge,
  TurnkeySessionDataWithExpiry,
} from '../services/turnkeyService';
import {
  clearSessionData,
  isEmailGranted,
  getJWTFromCookies,
  getUserFromLocalStorage,
  storeJWTInCookies,
  storeUserInLocalStorage,
  setLoggedEmail,
  saveToLocalStorage,
  TurnkeySessionKey,
} from '../services/storageService';
import { UserObject } from '../models/user';
import { backToThirdParty, sendMessageToReferrer } from './messageHandler';
import { GenerateChallengeParams, SubmitChallengeParams } from '../models/web3';
import { UiStates } from '../enums';
import { TStamper } from '@turnkey/http/dist/base';
import { ApiKeyStamper } from '@turnkey/api-key-stamper';

export function buildAuthPayload(
  clientId: string,
  jwt: string,
  userObj: UserObject,
): {
  token: string;
  email?: string;
  walletAddress: string;
} {
  //Won't send to SDK until these are set in cookies/storage (may not work in incognito though?)
  const token = getJWTFromCookies(clientId) || jwt;
  const user = getUserFromLocalStorage(clientId) || userObj;
  const emailGranted = isEmailGranted(clientId);

  if (!token) {
    throw new Error('JWT is missing. Ensure the user is authenticated.');
  }

  if (!user || !user.smartContractAddress) {
    throw new Error('User object or walletAddress is missing in local storage.');
  }

  return {
    token,
    walletAddress: user.smartContractAddress,
    email: emailGranted ? user.email : undefined,
  };
}

export function sendAuthPayloadToParent(
  payload: {
    token: string;
    email?: string;
    walletAddress: string;
    sharedVehicles?: BigInt[] | string[];
  },
  redirectUri: string,
  onSuccess: (payload: { token: string; email?: string; walletAddress: string }) => void,
) {
  sendMessageToReferrer({
    eventType: 'authResponse',
    ...payload,
    authType: window.opener ? 'popup' : 'embed',
  }); //TODO: authType to be deprecated soon, only kept for backwards compatibility

  onSuccess(payload);
}

export function logout(
  clientId: string,
  redirectUri: string,
  utm: string,
  setUiState: (step: UiStates) => void,
) {
  clearSessionData(clientId);
  sendMessageToReferrer({ eventType: 'logout' });

  const payload = { logout: 'true' };

  backToThirdParty(payload, redirectUri, utm, () => {
    setUiState(UiStates.EMAIL_INPUT);
  });
}

export function createSession({
  clientId,
  jwt,
  user,
  turnkeySessionData,
}: {
  clientId: string;
  jwt: string;
  user: UserObject;
  turnkeySessionData: TurnkeySessionDataWithExpiry;
}) {
  storeJWTInCookies(clientId, jwt);
  storeUserInLocalStorage(clientId, user);
  setLoggedEmail(clientId, user.email);
  updateTurnkeySession(turnkeySessionData);
}

export const updateTurnkeySession = (sessionData: TurnkeySessionDataWithExpiry) => {
  return saveToLocalStorage(TurnkeySessionKey, sessionData);
};

export function handlePostAuthUIState({
  entryState,
  clientId,
  jwt,
  user,
  redirectUri,
  utm,
  setUiState,
}: {
  entryState: string;
  clientId: string;
  jwt: string;
  user: UserObject;
  redirectUri: string;
  utm: string;
  setUiState: (step: UiStates) => void;
}) {
  if (entryState === UiStates.EMAIL_INPUT) {
    const authPayload = buildAuthPayload(clientId, jwt, user);
    sendAuthPayloadToParent(authPayload, redirectUri, (payload) => {
      backToThirdParty(payload, redirectUri, utm);
      setUiState(UiStates.SUCCESS); //For Embed Mode
    });
  } else if (entryState === UiStates.VEHICLE_MANAGER) {
    //Note: If the user is unauthenticated but the vehicle manager is the entry state, the payload will be sent to parent in the vehicle manager, after vehicles are shared
    setUiState(UiStates.VEHICLE_MANAGER); //Move to vehicle manager
  } else if (entryState === UiStates.ADVANCED_TRANSACTION) {
    setUiState(UiStates.ADVANCED_TRANSACTION);
  }
}

async function initializeKernelClient(
  subOrganizationId: string,
  stamper: TStamper,
): Promise<{
  smartContractAddress: string;
  walletAddress: string;
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
export async function getChallenge({
  clientId,
  redirectUri,
  smartContractAddress,
}: {
  clientId: string;
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
  clientId: string;
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
  clientId: string,
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
