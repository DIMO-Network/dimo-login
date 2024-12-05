import { Buffer } from "buffer";
import {
  generateChallenge,
  submitWeb3Challenge,
} from "../services/authService";
import {
  getSmartContractAddress,
  getWalletAddress,
  initializePasskey,
  signChallenge,
} from "../services/turnkeyService";
import { isStandalone } from "./isStandalone";
import {
  clearSessionData,
  getEmailGranted,
  getJWTFromCookies,
  getUserFromLocalStorage,
  storeJWTInCookies,
  storeUserInLocalStorage,
} from "../services/storageService";
import { UserObject } from "../models/user";
import { sendMessageToReferrer } from "./messageHandler";

export function buildAuthPayload(
  clientId: string,
  jwt?: string,
  userObj?: UserObject
): {
  token: string;
  email?: string;
  walletAddress: string;
} {
  //Won't send to SDK until these are set in cookies/storage (may not work in incognito though?)
  const token = getJWTFromCookies(clientId) || jwt;
  const user = getUserFromLocalStorage(clientId) || userObj;
  const emailGranted = getEmailGranted(clientId);

  if (!token) {
    throw new Error("JWT is missing. Ensure the user is authenticated.");
  }

  if (!user || !user.smartContractAddress) {
    throw new Error(
      "User object or walletAddress is missing in local storage."
    );
  }

  return {
    token,
    walletAddress: user.smartContractAddress,
    email: emailGranted ? user.email : undefined,
  };
}

export function sendAuthPayloadToParent(
  payload: { token: string; email?: string; walletAddress: string },
  redirectUri: string,
  onSuccess: (payload: {
    token: string;
    email?: string;
    walletAddress: string;
  }) => void
) {
  if (isStandalone()) {
    // Redirect with token in query params
    const queryParams = new URLSearchParams(payload).toString();
    window.location.href = `${redirectUri}?${queryParams}`;
    onSuccess(payload);
    return;
  }

  sendMessageToReferrer({
    eventType: "authResponse",
    ...payload,
    authType: window.opener ? "popup" : "embed",
  }); //TODO: authType to be deprecated soon, only kept for backwards compatibility

  if (window.opener) {
    //Close popup window after auth
    window.close();
  }
  onSuccess(payload);
}

export function logout(clientId: string, redirectUri: string) {
  clearSessionData(clientId);
  sendMessageToReferrer({eventType:"logout"});

  //Deal with post-logout
  if ( isStandalone() ) {
    window.location.href = redirectUri;
  } else if (window.opener) {
    //Close popup window after auth
    window.close();
  } else {

    //Embed TBD
  }
}

//TODO: Clean this up, and potentially move elsewhere
//This Function is basically just getting the JWT, Setting it in state, dealing with storage/cookies, and also navigating the UI
export async function authenticateUser(
  email: string,
  clientId: string,
  redirectUri: string,
  subOrganizationId: string | null,
  setJwt: (jwt: string) => void,
  setUiState: (step: string) => void,
  setUser: (user: UserObject) => void
) {
  console.log(`Authenticating user with email: ${email}`);

  if (!subOrganizationId) {
    throw new Error("Could not authenticate user, account not deployed");
  }

  if (subOrganizationId) {
    await initializePasskey(subOrganizationId);

    const smartContractAddress = getSmartContractAddress();
    const walletAddress = getWalletAddress();

    if (!smartContractAddress || !walletAddress) {
      throw new Error(
        "Could not authenticate user, wallet address does not exist"
      );
    }

    const resp = await generateChallenge(
      clientId, //This is a dev licence, use this with the dev.dimo.zone endpoint if using dev RPC's
      redirectUri, //Redirect uri for this dev licensce
      "openid email",
      smartContractAddress //We want this address to be recovered after signing
    );
    if (resp.success) {
      const challenge = resp.data.challenge;
      const state = resp.data.state;

      const signature = await signChallenge(challenge);

      if (signature) {
        const jwt = await submitWeb3Challenge(
          clientId,
          state,
          redirectUri,
          signature
        );

        
        const userProperties: UserObject = {
          email,
          subOrganizationId,
          walletAddress,
          smartContractAddress,
          hasPasskey: true, //TODO: These should not be hardcoded
          emailVerified: true, //TODO: These should not be hardcoded
        };
        
        //TODO, this can potentially be moved to a diff function
        setJwt(jwt.data.access_token); //Store in global state, to allow being used in VehicleManager component
        setUser(userProperties);
        storeJWTInCookies(clientId, jwt.data.access_token); // Store JWT in cookies
        storeUserInLocalStorage(clientId, userProperties); // Store user properties in localStorage

        setUiState("VEHICLE_MANAGER"); //Move to vehicle manager, and vehicle manager is what will determine if we go to success
      }
    }
  }
}
