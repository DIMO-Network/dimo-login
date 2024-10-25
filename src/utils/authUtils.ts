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
  signChallenge,
} from "../services/turnkeyService";


function sendTokenToParent(token: string, onSuccess: (token: string) => void) {
  const parentOrigin = new URL(document.referrer).origin;
  if (window.opener) {
    window.opener.postMessage(
      { token, authType: "popup" },
      parentOrigin
    );
    window.close();
  } else if (window.parent) {
    window.parent.postMessage(
      { token, authType: "embed" },
      parentOrigin
    );
  }

  // Trigger success callback
  onSuccess(token);
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
  smartContractAddress: string,
  onSuccess: (token: string) => void
) {
  console.log(`Authenticating user with email: ${email}`);

  if (subOrganizationId && walletAddress) {
    await initializePasskey(subOrganizationId, walletAddress);

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
        challenge,
        subOrganizationId,
        walletAddress
      );

      if (signature) {
        const jwt = await submitWeb3Challenge(
          clientId,
          state,
          redirectUri,
          signature
        );

        sendTokenToParent(jwt.data.access_token, onSuccess);
      }
    }
  }
}


