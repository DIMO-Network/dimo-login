import { generateChallenge, submitWeb3Challenge } from '../services/authService';
import {
  getSmartContractAddress,
  getWalletAddress,
  initializePasskey,
  signChallenge,
} from '../services/turnkeyService';
import {
  clearSessionData,
  getEmailGranted,
  getJWTFromCookies,
  getUserFromLocalStorage,
  storeJWTInCookies,
  storeUserInLocalStorage,
} from '../services/storageService';
import { UserObject } from '../models/user';
import { backToThirdParty, sendMessageToReferrer } from './messageHandler';
import { GenerateChallengeParams, SubmitChallengeParams } from '../models/web3';
import { UiStates } from '../context/UIManagerContext';

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
  const emailGranted = getEmailGranted(clientId);

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

function handleAuthenticatedUser({
  clientId,
  jwt,
  userProperties,
  setJwt,
  setUser,
}: {
  clientId: string;
  jwt: string;
  userProperties: UserObject;
  setJwt: (jwt: string) => void;
  setUser: (user: UserObject) => void;
}) {
  setJwt(jwt);
  setUser(userProperties);
  storeJWTInCookies(clientId, jwt);
  storeUserInLocalStorage(clientId, userProperties);
}

function handlePostAuthUIState({
  entryState,
  clientId,
  jwt,
  userProperties,
  redirectUri,
  utm,
  setUiState,
}: {
  entryState: string;
  clientId: string;
  jwt: string;
  userProperties: UserObject;
  redirectUri: string;
  utm: string;
  setUiState: (step: UiStates) => void;
}) {
  if (entryState === UiStates.EMAIL_INPUT) {
    const authPayload = buildAuthPayload(clientId, jwt, userProperties);
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
): Promise<{ smartContractAddress: string; walletAddress: string }> {
  await initializePasskey(subOrganizationId);

  const smartContractAddress = getSmartContractAddress();
  const walletAddress = getWalletAddress();

  if (!smartContractAddress || !walletAddress) {
    throw new Error('Could not authenticate user, wallet address does not exist');
  }

  return { smartContractAddress, walletAddress };
}

// Helper function to generate challenge and state
async function getChallenge({
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
  email: string,
  clientId: string,
  redirectUri: string,
  utm: string,
  subOrganizationId: string | null,
  entryState: string,
  setJwt: (jwt: string) => void,
  setUiState: (step: UiStates) => void,
  setUser: (user: UserObject) => void,
) {
  console.log(`Authenticating user with email: ${email}`);
  if (!subOrganizationId) {
    throw new Error('Could not authenticate user, account not deployed');
  }
  const { smartContractAddress, walletAddress } =
    await initializeKernelClient(subOrganizationId);

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

  const userProperties: UserObject = {
    email,
    subOrganizationId,
    walletAddress,
    smartContractAddress,
    hasPasskey: true, //TODO: These should not be hardcoded
    emailVerified: true, //TODO: These should not be hardcoded
  };

  handleAuthenticatedUser({
    clientId,
    jwt: accessToken,
    userProperties,
    setJwt,
    setUser,
  });

  //Parse Entry State
  handlePostAuthUIState({
    entryState,
    clientId,
    jwt: accessToken,
    userProperties,
    redirectUri,
    utm,
    setUiState,
  });
}
