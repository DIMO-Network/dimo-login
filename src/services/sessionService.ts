// sessionService.ts

import { UserObject } from "../models/user";
import { getJWTFromCookies, getUserFromLocalStorage } from "./storageService";
import { isTokenExpired } from "./tokenService";

// Define types for the function parameters
type InitializeSessionParams = {
  clientId: string | null;
  setJwt: (jwt: string) => void;
  setUser: (user: UserObject) => void;
  uiState: string;
  setUiState: (step: string) => void;
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
    console.error("Client ID is missing. Cannot initialize session.");
    setUserInitialized(true);
    return;
  }

  const jwt = getJWTFromCookies(clientId);
  const user = getUserFromLocalStorage(clientId);

  if (jwt && !isTokenExpired(jwt) && user) {
    setJwt(jwt);
    setUser(user);

    if (uiState === "EMAIL_INPUT") {
      setUiState("SUCCESS");
    }

  } else {
    // If JWT or user is invalid, reset the state
    setUiState("EMAIL_INPUT");
  }

  setUserInitialized(true);
}
