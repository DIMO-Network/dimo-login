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
};

export function initializeSession({
  clientId,
  setJwt,
  setUser,
  uiState,
  setUiState,
  entryState,
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
      const target =
        entryState && entryState !== UiStates.EMAIL_INPUT
          ? entryState
          : UiStates.SUCCESS;
      setUiState(target);
    }
  } else {
    // If JWT or user is invalid, reset the state
    setUiState(UiStates.EMAIL_INPUT);
  }
}
