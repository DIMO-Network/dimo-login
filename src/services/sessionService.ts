// sessionService.ts

import { UiStates } from '../enums';
import { UserObject } from '../models/user';
import { getJWTFromCookies, getUserFromLocalStorage } from './storageService';
import { isTokenExpired } from './tokenService';

// Define types for the function parameters
type InitializeSessionParams = {
  clientId: string | null;
  setJwt: (jwt: string) => void;
  setUser: (user: UserObject) => void;
  uiState: UiStates;
  setUiState: (step: UiStates) => void;
  setUserInitialized: (initialized: boolean) => void;
};

export function initializeSession({
  clientId,
  setJwt,
  setUser,
  uiState,
  setUiState,
  setUserInitialized,
}: InitializeSessionParams): void {
  if (!clientId) {
    console.error('Client ID is missing. Cannot initialize session.');
    setUserInitialized(true);
    return;
  }

  const jwt = getJWTFromCookies(clientId);
  const user = getUserFromLocalStorage(clientId);

  if (jwt && !isTokenExpired(jwt) && user) {
    setJwt(jwt);
    setUser(user);

    if (uiState === UiStates.EMAIL_INPUT) {
      setUiState(UiStates.SUCCESS);
    }
  } else {
    // If JWT or user is invalid, reset the state
    setUiState(UiStates.EMAIL_INPUT);
  }

  setUserInitialized(true);
}
