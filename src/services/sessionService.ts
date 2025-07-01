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
  entryState: string;
};

export function initializeSession({
  clientId,
  setJwt,
  setUser,
  uiState,
  setUiState,
  setUserInitialized,
  entryState,
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
    if (entryState) {
      if (entryState === UiStates.EMAIL_INPUT) {
        return setUiState(UiStates.SUCCESS);
      }
      // TODO - figure out validation
      return setUiState(entryState as UiStates);
    }
    return setUiState(UiStates.SUCCESS);
    // if (entryState) {
    //   setUiState(entryState as UiStates);
    // } else {
    //   setUiState(UiStates.SUCCESS);
    // }
    // console.log('I AM HERE!!!', uiState, entryState);
    // if (uiState === UiStates.EMAIL_INPUT) {
    //   setUiState(UiStates.SUCCESS);
    // } else if (entryState) {
    //   setUiState(entryState as UiStates);
    // }
  } else {
    console.log('No JWT found', jwt);
    // If JWT or user is invalid, reset the state
    setUiState(UiStates.EMAIL_INPUT);
  }

  setUserInitialized(true);
}
