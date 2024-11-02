import { verifyEmail } from "../services/accountsService";
// import { ethers } from 'ethers';
import { Buffer } from "buffer";
import {
  generateChallenge,
  submitWeb3Challenge,
} from "../services/authService";
import {
  createPasskey,
  initializePasskey,
  openSessionWithPasskey,
  setVehiclePermissions,
  signChallenge,
} from "../services/turnkeyService";
import { isStandalone } from "./isStandalone";
import { sacdPermissionValue } from "@dimo-network/transactions";
import { fetchVehiclesWithTransformation } from "../services/identityService";

export function sendTokenToParent(
  token: string,
  redirectUri: string,
  onSuccess: (token: string) => void
) {
  if (isStandalone()) {
    //Do a redirect here
    window.location.href = `${redirectUri}?token=${token}`;
    onSuccess(token);
    return;
  }
  const parentOrigin = new URL(document.referrer).origin;
  if (window.opener) {
    window.opener.postMessage({ token, authType: "popup" }, parentOrigin);
    window.close();
  } else if (window.parent) {
    window.parent.postMessage({ token, authType: "embed" }, parentOrigin);
  }
  onSuccess(token);

  // Trigger success callback
}

export async function generateTargetPublicKey(): Promise<string> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  const publicKey = await window.crypto.subtle.exportKey(
    "raw",
    keyPair.publicKey
  );

  const publicKeyHex = Array.from(new Uint8Array(publicKey))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return publicKeyHex;
}

export function generateRandomBuffer(): ArrayBuffer {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return arr.buffer;
}

export function base64UrlEncode(challenge: ArrayBuffer): string {
  return Buffer.from(challenge)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function bufferToHex(arrayBuffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(arrayBuffer);
  return Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function bufferToBase64(buffer: Uint8Array): string {
  // Convert the Uint8Array to a string using Array.from()
  const binaryString = Array.from(buffer)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binaryString);
}

export async function authenticateUser(
  email: string,
  clientId: string,
  redirectUri: string,
  subOrganizationId: string | null,
  walletAddress: string | null,
  smartContractAddress: string | null,
  setJwt: (jwt: string) => void,
  setAuthStep: (step: number) => void,
  permissionTemplateId?: string
) {
  console.log(`Authenticating user with email: ${email}`);

  if ( !smartContractAddress ) {
    throw new Error("Could not authenticate user, account not deployed");
  }


  if (subOrganizationId && walletAddress) {
    await initializePasskey(subOrganizationId, walletAddress);

    const session = await openSessionWithPasskey();

    const resp = await generateChallenge(
      clientId, //This is a dev licence, use this with the dev.dimo.zone endpoint if using dev RPC's
      redirectUri, //Redirect uri for this dev licensce
      "openid email",
      smartContractAddress //We want this address to be recovered after signing
    );
    if (resp.success) {
      const challenge = resp.data.challenge;
      const state = resp.data.state;

      const signature = await signChallenge(
        challenge
      );

      if (signature) {
        const jwt = await submitWeb3Challenge(
          clientId,
          state,
          redirectUri,
          signature
        );

        setJwt(jwt.data.access_token)


        if (!permissionTemplateId) {
          // No permissions required, send JWT to parent and move to success page
          sendTokenToParent(jwt.data.access_token, redirectUri, () => {
            setAuthStep(3); // Move to success page
          });
        } else {
          // Permissions required, move to permissions screen
          setAuthStep(2);
        }        
      }
    }
  }
}
