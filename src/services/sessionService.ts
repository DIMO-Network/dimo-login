// sessionService.ts

import { getJWTFromCookies, getUserFromLocalStorage } from "./storageService";
import { isTokenExpired } from "./tokenService";

// Define types for the function parameters
type InitializeSessionParams = {
  clientId: string | null;
  setJwt: (jwt: string) => void;
  setUser: (user: any) => void; // Replace `any` with a specific user type if you have one
  uiState: string;
  setUiState: (step: string) => void;
};

export function initializeSession({
  clientId,
  setJwt,
  setUser,
  uiState,
  setUiState,
}: InitializeSessionParams): void {
  if (!clientId) return;

  const jwt = getJWTFromCookies(clientId);
  const user = getUserFromLocalStorage(clientId);

  if (jwt && !isTokenExpired(jwt) && user) {
    setJwt(jwt);
    setUser(user);
    //
    if ( uiState == "EMAIL_INPUT" ) {
      setUiState("SUCCESS");
    }
  } else {
    setUiState("EMAIL_INPUT");
  }

}
