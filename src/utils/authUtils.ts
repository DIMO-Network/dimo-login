import {
  generateChallenge,
  submitWeb3Challenge,
} from "../services/authService";
import {
  getSmartContractAddress,
  getWalletAddress,
  initializePasskey,
  signChallenge,
} from "../services/turnkeyService";
import {
  clearSessionData,
  getEmailGranted,
  getJWTFromCookies,
  getUserFromLocalStorage,
  storeJWTInCookies,
  storeUserInLocalStorage,
} from "../services/storageService";
import { UserObject } from "../models/user";
import { backToThirdParty, sendMessageToReferrer } from "./messageHandler";
import { GenerateChallengeParams, SubmitChallengeParams } from "../models/web3";
import { UiStates } from "../context/UIManagerContext";

export function buildAuthPayload(
  clientId: string,
  jwt: string,
  userObj: UserObject
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
    throw new Error("JWT is missing. Ensure the user is authenticated.");
  }

  if (!user || !user.smartContractAddress) {
    throw new Error(
      "User object or walletAddress is missing in local storage."
    );
  }

  return {
    token,
    walletAddress: user.smartContractAddress,
    email: emailGranted ? user.email : undefined,
  };
}

export function sendAuthPayloadToParent(
  payload: { token: string; email?: string; walletAddress: string, sharedVehicles?: BigInt[] | string[] },
  redirectUri: string,
  onSuccess: (payload: {
    token: string;
    email?: string;
    walletAddress: string;
  }) => void
) {
  sendMessageToReferrer({
    eventType: "authResponse",
    ...payload,
    authType: window.opener ? "popup" : "embed",
  }); //TODO: authType to be deprecated soon, only kept for backwards compatibility

  onSuccess(payload);
}

export function logout(
  clientId: string,
  redirectUri: string,
  utm: string,
  setUiState: (step: UiStates) => void
) {
  clearSessionData(clientId);
  sendMessageToReferrer({ eventType: "logout" });

  const payload = { logout: "true" };

  backToThirdParty(payload, redirectUri, utm, () => {
    setUiState(UiStates.EMAIL_INPUT);
  });
}

interface AuthenticateUserProps {
  email: string,
  clientId: string,
  redirectUri: string,
  utm: string,
  subOrganizationId: string | null,
}

async function getSignedChallenge(params: GenerateChallengeParams) {
  const challengeResponse = await generateChallenge(params);
  if (!challengeResponse.success) {
    throw new Error('Failed to generate challenge');
  }
  const challenge = challengeResponse.data.challenge;
  const state = challengeResponse.data.state;
  const signature = await signChallenge(challenge);
  return {state, signature};
}

export async function authenticateUser(args: AuthenticateUserProps): Promise<{account: UserObject; accessToken: string}> {
  const {subOrganizationId, clientId, redirectUri, email} = args;
  if (!subOrganizationId) {
    throw new Error("Could not authenticate user, account not deployed");
  }
  await initializePasskey(subOrganizationId);
  const smartContractAddress = getSmartContractAddress();
  const walletAddress = getWalletAddress();
  if (!smartContractAddress || !walletAddress) {
    throw new Error(
      "Could not authenticate user, wallet address does not exist"
    );
  }
  const {state, signature} = await getSignedChallenge({
    clientId: clientId,
    domain: redirectUri,
    scope: "openid email",
    address: smartContractAddress, //We want this address to be recovered after signing
  });
  if (!signature) {
    throw new Error('Could not get signature from signed challenge');
  }
  const jwt = await submitWeb3Challenge({
    clientId,
    state,
    domain: redirectUri,
    signature,
  });

  if (!jwt.success) {
    throw new Error("Failed to submit web3 challenge");
  }

  const account: UserObject = {
    email,
    subOrganizationId,
    walletAddress,
    smartContractAddress,
    hasPasskey: true, //TODO: These should not be hardcoded
    emailVerified: true, //TODO: These should not be hardcoded
  };

  return {
    account,
    accessToken: jwt.data.access_token
  }
}
