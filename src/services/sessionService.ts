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

    // DEBUG-SACD: Log session initialization
    console.log('🔵 DEBUG-SACD: sessionService - Existing session found:', {
      hasJwt: !!jwt,
      hasUser: !!user,
      currentUiState: uiState,
      entryState: entryState,
    });

    // If user has an existing session, route them based on entryState
    if (uiState === UiStates.EMAIL_INPUT) {
      // Determine where to route based on entryState
      if (entryState === UiStates.VEHICLE_MANAGER) {
        console.log('🔵 DEBUG-SACD: sessionService - Routing to VEHICLE_MANAGER');
        setUiState(UiStates.VEHICLE_MANAGER);
      } else if (entryState === UiStates.ACCOUNT_MANAGER) {
        console.log('🔵 DEBUG-SACD: sessionService - Routing to ACCOUNT_MANAGER');
        setUiState(UiStates.ACCOUNT_MANAGER);
      } else if (entryState === UiStates.ADVANCED_TRANSACTION) {
        console.log('🔵 DEBUG-SACD: sessionService - Routing to ADVANCED_TRANSACTION');
        setUiState(UiStates.ADVANCED_TRANSACTION);
      } else {
        // Default: Complete auth immediately (backward compatible)
        console.log('🔵 DEBUG-SACD: sessionService - Routing to SUCCESS (default)');
        setUiState(UiStates.SUCCESS);
      }
    }
  } else {
    // If JWT or user is invalid, reset the state
    console.log('🔵 DEBUG-SACD: sessionService - No valid session, routing to EMAIL_INPUT');
    setUiState(UiStates.EMAIL_INPUT);
  }
}
