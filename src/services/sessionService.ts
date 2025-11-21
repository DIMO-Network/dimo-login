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
  entryState?: string;
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

    // If user has an existing session, route them based on entryState
    if (uiState === UiStates.EMAIL_INPUT) {
      // Determine where to route based on entryState
      if (entryState === UiStates.VEHICLE_MANAGER) {
        setUiState(UiStates.VEHICLE_MANAGER);
      } else if (entryState === UiStates.ACCOUNT_MANAGER) {
        setUiState(UiStates.ACCOUNT_MANAGER);
      } else if (entryState === UiStates.ADVANCED_TRANSACTION) {
        setUiState(UiStates.ADVANCED_TRANSACTION);
      } else {
        // Default: Complete auth immediately (backward compatible)
        setUiState(UiStates.SUCCESS);
      }
    }
  } else {
    // If JWT or user is invalid, reset the state
    setUiState(UiStates.EMAIL_INPUT);
  }
}
