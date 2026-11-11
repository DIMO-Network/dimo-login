import type { TurnkeySessionDataWithExpiry } from '../services/turnkeyService';
import {
  clearSessionData,
  isEmailGranted,
  setLoggedEmail,
  storeJWTInCookies,
  storeUserInLocalStorage,
} from '../services/storageService';
import { isTokenExpired } from '../services/tokenService';
import { UserObject } from '../models/user';
import {
  endWalletSession,
  getLastSignedInSubOrganizationId,
  rememberAccount,
  setWalletSession,
} from '../services/accountStore';
import { backToThirdParty, sendMessageToReferrer } from './messageHandler';
import { UiStates } from '../enums';
import { getEmailRequest } from '../stores/AuthStateStore';
import { needsEmailConsent } from './emailRequest';
import type { TurnkeyClient } from '@turnkey/http';

/** What signs Turnkey requests: the passkey or the session's API key. */
export type TStamper = ConstructorParameters<typeof TurnkeyClient>[1];

/** A token with less than this left is never handed to an app. */
const MIN_SENT_TOKEN_LIFETIME_S = 60;
export const TOKEN_EXPIRED_ERROR = 'Token expired';
export const isTokenExpiredError = (err: unknown) =>
  err instanceof Error && err.message === TOKEN_EXPIRED_ERROR;

/**
 * The login to hand the app: this tab's token and account, as the caller
 * passes them, never the stored ones. Another tab of the same app may have
 * stored someone else's, and under the app's prompt this tab leaves the stored
 * session unused. Throws TOKEN_EXPIRED_ERROR for a token about to run out (the
 * caller signs in again; see useSendOrSignInAgain).
 */
export function buildAuthPayload(
  clientId: `0x${string}` | null,
  token: string,
  user: UserObject,
): {
  token: string;
  email?: string;
  walletAddress: string;
} {
  // An app that asked for no email never gets one, whatever was granted.
  const emailGranted =
    getEmailRequest() !== 'none' && isEmailGranted(clientId, user?.email);

  if (!token) {
    throw new Error('JWT is missing. Ensure the user is authenticated.');
  }

  if (isTokenExpired(token, MIN_SENT_TOKEN_LIFETIME_S)) {
    throw new Error(TOKEN_EXPIRED_ERROR);
  }

  if (!user || !user.smartContractAddress) {
    throw new Error('User object or walletAddress is missing.');
  }

  return {
    token,
    walletAddress: user.smartContractAddress,
    email: emailGranted ? user.email : undefined,
  };
}

export interface AuthPayload {
  token: string;
  email?: string;
  walletAddress: string;
  sharedVehicles?: BigInt[] | string[];
  // Manage → Extend 1 year / Stop sharing, as redirect mode reports them too.
  extendedVehicles?: string[];
  revokedVehicles?: string[];
  // Account-sharing lane: surfaced to the SDK on a successful account grant.
  accountGranted?: boolean;
  transactionHash?: string;
}

export function sendAuthPayloadToParent(
  payload: AuthPayload,
  redirectUri: string,
  onSuccess: (payload: { token: string; email?: string; walletAddress: string }) => void,
) {
  sendMessageToReferrer(
    {
      eventType: 'authResponse',
      ...payload,
      authType: window.opener ? 'popup' : 'embed', //TODO: authType to be deprecated soon, only kept for backwards compatibility
    },
    redirectUri,
  );

  onSuccess(payload);
}

export function logout(
  clientId: `0x${string}` | null,
  redirectUri: string,
  utm: string,
  setUiState: (step: UiStates) => void,
) {
  // An explicit logout also ends the wallet session, so on a shared device the
  // next person cannot resume this account silently. The account stays remembered.
  endWalletSession(getLastSignedInSubOrganizationId(clientId));
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
  clientId: `0x${string}` | null;
  jwt: string;
  user: UserObject;
  turnkeySessionData: TurnkeySessionDataWithExpiry;
}) {
  storeJWTInCookies(clientId, jwt);
  storeUserInLocalStorage(clientId, user);
  setLoggedEmail(clientId, user.email);
  setWalletSession(user.subOrganizationId, turnkeySessionData);
  rememberAccount(user);
}

/** Plain login: hand the token (and the email, if shared) to the app. */
export function sendLoginToApp({
  clientId,
  jwt,
  user,
  redirectUri,
  utm,
  setUiState,
}: {
  clientId: `0x${string}` | null;
  jwt: string;
  user: UserObject;
  redirectUri: string;
  utm: string;
  setUiState: (step: UiStates) => void;
}) {
  const authPayload = buildAuthPayload(clientId, jwt, user);
  sendAuthPayloadToParent(authPayload, redirectUri, (payload) => {
    backToThirdParty(payload, redirectUri, utm);
    setUiState(UiStates.SUCCESS); //For Embed Mode
  });
}

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
  clientId: `0x${string}` | null;
  jwt: string;
  user: UserObject;
  redirectUri: string;
  utm: string;
  setUiState: (step: UiStates) => void;
}) {
  if (entryState === UiStates.EMAIL_INPUT) {
    // A plain login asks for the email on its own step, once per app and
    // account; the other flows ask with the rest of their request.
    if (needsEmailConsent(clientId, user?.email, getEmailRequest())) {
      setUiState(UiStates.EMAIL_CONSENT);
      return;
    }
    sendLoginToApp({ clientId, jwt, user, redirectUri, utm, setUiState });
  } else if (entryState === UiStates.VEHICLE_MANAGER) {
    //Note: If the user is unauthenticated but the vehicle manager is the entry state, the payload will be sent to parent in the vehicle manager, after vehicles are shared
    setUiState(UiStates.VEHICLE_MANAGER); //Move to vehicle manager
  } else if (entryState === UiStates.ACCOUNT_MANAGER) {
    //Note: If the user is unauthenticated but the account manager is the entry state, the payload will be sent to parent in the account manager, after the account SACD is signed
    setUiState(UiStates.ACCOUNT_MANAGER); //Move to account manager
  } else if (entryState === UiStates.ADVANCED_TRANSACTION) {
    setUiState(UiStates.ADVANCED_TRANSACTION);
  } else if (entryState === UiStates.SIGN_MESSAGE) {
    setUiState(UiStates.SIGN_MESSAGE);
  } else if (entryState === UiStates.PROVISION_DEVELOPER_LICENSE) {
    setUiState(UiStates.PROVISION_DEVELOPER_LICENSE);
  }
}

export const INVALID_SESSION_ERROR = 'Invalid session';
export const isInvalidSessionError = (err: unknown) =>
  err instanceof Error && err.message === INVALID_SESSION_ERROR;
