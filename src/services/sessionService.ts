// sessionService.ts

import { UiStates } from '../enums';
import { UserObject } from '../models/user';
import { getJWTFromCookies, getUserFromLocalStorage } from './storageService';
import { isTokenExpired } from './tokenService';

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
};

export function initializeSession({
  clientId,
  setJwt,
  setUser,
  uiState,
  setUiState,
  entryState,
  onReturningLogin,
}: InitializeSessionParams): void {
  if (!clientId) {
    console.error('Client ID is missing. Cannot initialize session.');
    return;
  }

  const jwt = getJWTFromCookies(clientId);
  const user = getUserFromLocalStorage(clientId);

  if (jwt && !isTokenExpired(jwt) && user) {
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
