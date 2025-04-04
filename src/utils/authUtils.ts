import { generateChallenge, submitWeb3Challenge } from '../services/authService';
import {
  getSmartContractAddress,
  getWalletAddress,
  initializePasskey,
  signChallenge,
} from '../services/turnkeyService';
import {
  clearSessionData,
  getEmailGranted,
  getJWTFromCookies,
  getUserFromLocalStorage,
  storeJWTInCookies,
  storeUserInLocalStorage,
} from '../services/storageService';
import { UserObject } from '../models/user';
import { backToThirdParty, sendMessageToReferrer } from './messageHandler';
import { GenerateChallengeParams, SubmitChallengeParams } from '../models/web3';
import { UiStates } from '../context/UIManagerContext';

export function buildAuthPayload(
  clientId: string,
  jwt: string,
  userObj: UserObject,
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
    throw new Error('JWT is missing. Ensure the user is authenticated.');
  }

  if (!user || !user.smartContractAddress) {
    throw new Error('User object or walletAddress is missing in local storage.');
  }

  return {
    token,
    walletAddress: user.smartContractAddress,
    email: emailGranted ? user.email : undefined,
  };
}

export function sendAuthPayloadToParent(
  payload: {
    token: string;
    email?: string;
    walletAddress: string;
    sharedVehicles?: BigInt[] | string[];
  },
  redirectUri: string,
  onSuccess: (payload: { token: string; email?: string; walletAddress: string }) => void,
) {
  sendMessageToReferrer({
    eventType: 'authResponse',
    ...payload,
    authType: window.opener ? 'popup' : 'embed',
  }); //TODO: authType to be deprecated soon, only kept for backwards compatibility

  onSuccess(payload);
}

export function logout(
  clientId: string,
  redirectUri: string,
  utm: string,
  setUiState: (step: UiStates) => void,
) {
  clearSessionData(clientId);
  sendMessageToReferrer({ eventType: 'logout' });

  const payload = { logout: 'true' };

  backToThirdParty(payload, redirectUri, utm, () => {
    setUiState(UiStates.EMAIL_INPUT);
  });
}

//TODO: Clean this up, and potentially move elsewhere
//This Function is basically just getting the JWT, Setting it in state, dealing with storage/cookies, and also navigating the UI
export async function authenticateUser(
  email: string,
  clientId: string,
  redirectUri: string,
  utm: string,
  subOrganizationId: string | null,
  entryState: string,
  setJwt: (jwt: string) => void,
  setUiState: (step: UiStates) => void,
  setUser: (user: UserObject) => void,
) {
  console.log(`Authenticating user with email: ${email}`);

  if (!subOrganizationId) {
    throw new Error('Could not authenticate user, account not deployed');
  }

  if (subOrganizationId) {
    console.log('Debugging Account Creation');
    await initializePasskey(subOrganizationId);

    console.log('Passkey Initialized');

    const smartContractAddress = getSmartContractAddress();
    const walletAddress = getWalletAddress();

    if (!smartContractAddress || !walletAddress) {
      throw new Error('Could not authenticate user, wallet address does not exist');
    }

    const generateChallengeParams: GenerateChallengeParams = {
      clientId,
      domain: redirectUri,
      scope: 'openid email',
      address: smartContractAddress, //We want this address to be recovered after signing
    };

    const resp = await generateChallenge(generateChallengeParams);

    if (resp.success) {
      const challenge = resp.data.challenge;
      const state = resp.data.state;

      const signature = await signChallenge(challenge);

      if (signature) {
        const web3ChallengeSubmission: SubmitChallengeParams = {
          clientId,
          state,
          domain: redirectUri,
          signature,
        };

        const jwt = await submitWeb3Challenge(web3ChallengeSubmission);

        if (!jwt.success) {
          throw new Error('Failed to submit web3 challenge');
        }

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

        //Parse Entry State
        if (entryState === UiStates.EMAIL_INPUT) {
          const authPayload = buildAuthPayload(
            clientId,
            jwt.data.access_token,
            userProperties,
          );
          sendAuthPayloadToParent(authPayload, redirectUri, (payload) => {
            backToThirdParty(payload, redirectUri, utm);
            setUiState(UiStates.SUCCESS); //For Embed Mode
          });
        } else if (entryState === UiStates.VEHICLE_MANAGER) {
          //Note: If the user is unauthenticated but the vehicle manager is the entry state, the payload will be sent to parent in the vehicle manager, after vehicles are shared
          setUiState(UiStates.VEHICLE_MANAGER); //Move to vehicle manager
        } else if (entryState === UiStates.ADVANCED_TRANSACTION) {
          setUiState(UiStates.ADVANCED_TRANSACTION);
        }
      }
    }
  }
}
