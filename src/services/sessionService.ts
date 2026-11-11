// sessionService.ts

import { UiStates } from '../enums';
import type { LoginPrompt } from '../utils/loginPrompt';
import { UserObject } from '../models/user';
import { getJWTFromCookies, getUserFromLocalStorage } from './storageService';
import { isTokenExpired } from './tokenService';

/** A cached token only counts as a session with at least this long left, so the app never gets one about to expire. */
export const MIN_SESSION_TOKEN_LIFETIME_S = 3600;

// Define types for the function parameters
type InitializeSessionParams = {
  clientId: `0x${string}` | null;
  setJwt: (jwt: string) => void;
  setUser: (user: UserObject) => void;
  uiState: UiStates;
  setUiState: (step: UiStates) => void;
  entryState?: UiStates;
  /**
   * A plain login on a still-valid session. Defaults to the done screen, whose
   * Back sends the login; embedded, there's no Back, so App sends it instead.
   */
  onReturningLogin?: (jwt: string, user: UserObject) => void;
  /**
   * What the app asked of this sign-in (SDK `prompt`). Either value ignores a
   * cached session, so the person picks an account or signs in again. The
   * stored session stays: choosing the same account resumes it.
   */
  prompt?: LoginPrompt;
  /**
   * The account the app expects, normalised (normalizeLoginHint: a lowercase
   * email). A cached session for another account is ignored, one for this
   * account (its email compared ignoring case) is used.
   */
  loginHint?: string;
};

export function initializeSession({
  clientId,
  setJwt,
  setUser,
  uiState,
  setUiState,
  entryState,
  onReturningLogin,
  prompt,
  loginHint,
}: InitializeSessionParams): void {
  if (!clientId) {
    console.error('Client ID is missing. Cannot initialize session.');
    return;
  }

  const jwt = getJWTFromCookies(clientId);
  const user = getUserFromLocalStorage(clientId);

  const mismatch =
    Boolean(prompt) ||
    (loginHint !== undefined && user?.email?.toLowerCase() !== loginHint);
  // A logout is about the session there is, whatever the app asked for.
  const askedForAnother = entryState !== UiStates.LOGOUT && mismatch;

  if (
    jwt &&
    !isTokenExpired(jwt, MIN_SESSION_TOKEN_LIFETIME_S) &&
    user &&
    !askedForAnother
  ) {
    setJwt(jwt);
    setUser(user);

    if (uiState === UiStates.EMAIL_INPUT) {
      // If a specific entry state was requested, route there directly rather
      // than the generic post-login success screen (e.g. PROVISION_DEVELOPER_LICENSE).
      if (entryState && entryState !== UiStates.EMAIL_INPUT) {
        setUiState(entryState);
      } else if (onReturningLogin) {
        onReturningLogin(jwt, user);
      } else {
        setUiState(UiStates.SUCCESS);
      }
    }
  } else if (entryState === UiStates.LOGOUT) {
    // Nothing to sign out of, but the app still expects to hear `logout`.
    setUiState(UiStates.LOGOUT);
  } else {
    // If JWT or user is invalid, reset the state
    setUiState(UiStates.EMAIL_INPUT);
  }
}
