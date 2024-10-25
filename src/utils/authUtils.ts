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

// src/utils/authUtils.ts
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

function base64ToHex(base64String: string): string {
  const raw = atob(base64String); // Decode Base64 to binary string
  let hex = "";

  for (let i = 0; i < raw.length; i++) {
    const hexChar = raw.charCodeAt(i).toString(16);
    hex += hexChar.padStart(2, "0"); // Ensure each byte is two characters long
  }

  return `0x${hex}`;
}

/**
 * Converts a Base64URL string into a Base64 string
 * @param base64UrlString - Base64URL encoded string
 * @returns Base64 encoded string
 */
function base64UrlToBase64(base64UrlString: string): string {
  // Convert Base64URL to Base64 by replacing '-' with '+', '_' with '/'
  let base64 = base64UrlString.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if necessary
  while (base64.length % 4) {
    base64 += "=";
  }

  return base64;
}

/**
 * Decodes a Base64 string into a Uint8Array (byte array)
 * @param base64String - Base64 encoded string
 * @returns Uint8Array representing the binary data
 */
function base64ToUint8Array(base64String: string): Uint8Array {
  // Decode Base64 string into binary string
  const binaryString = atob(base64String);

  // Convert binary string into Uint8Array (byte array)
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Converts a Uint8Array to a hexadecimal string with a '0x' prefix
 * @param uint8Array - Uint8Array to convert
 * @returns Hexadecimal string with '0x' prefix
 */
function uint8ArrayToHex(uint8Array: Uint8Array): string {
  // Convert Uint8Array to hexadecimal string
  const hexString = Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  // Add '0x' prefix to indicate hexadecimal format
  return "0x" + hexString;
}

/**
 * Validates if a string is a correct hexadecimal string with an optional '0x' prefix
 * @param hexString - String to validate
 * @returns Boolean indicating whether the string is a valid hex
 */
function isValidHex(hexString: string): boolean {
  // Regex to check for valid hexadecimal format, optionally starting with '0x'
  const hexRegex = /^0x[0-9a-fA-F]+$/;
  return hexRegex.test(hexString);
}

// console.log("Hexadecimal Signature:", hexSignature);

// // Step 4: Verify if it's a valid hexadecimal string
// if (isValidHex(hexSignature)) {
//   console.log("Valid Hexadecimal Signature");
// } else {
//   console.log("Invalid Hexadecimal Signature");
// }

export function toHexSignature(r: string, s: string, v: string): string {
  // Concatenate r, s, and v values

  const signatureR = "0x" + r;
  const signatureS = "0x" + s;

  // Convert v from hex to decimal
  let signatureV = parseInt(v, 16); // Convert hex "01" to decimal 1  
  let signatureV27 = signatureV + 27; // v = 27
  return "";
  // const combinedSignatureV27 = ethers.utils.joinSignature({ r: signatureR, s: signatureS, v: signatureV27 });


  // // Ensure the hex signature is prefixed with 0x
  // return combinedSignatureV27
}

// Example usage:
// const r = "30f4ad5e43e05ad3e29885b15f895b27042694849d3395e71dc761cdef20a071";
// const s = "1ab9ab03700472cd702a0dcb9fb8341c0dbddb7a8b209fe9d51753da1b4f3aaf";
// const v = "01";

// const hexSignature = toHexSignature(r, s, v);
// console.log(hexSignature);

export async function authenticateUser(
  email: string,
  subOrganizationId: string | null,
  walletAddress: string | null,
  smartContractAddress: string,
  onSuccess: (token: string) => void
) {
  console.log(`Authenticating user with email: ${email}`);

  // Simulate a delay for authentication
  const token = "fake-jwt-token"; // Fake token
  console.log("Authentication successful, token:", token);

  if (subOrganizationId && walletAddress) {
    // await createPasskey(email);
    await initializePasskey(subOrganizationId, walletAddress);

    // const resp = await generateChallenge(
    //   "0xeAa35540a94e3ebdf80448Ae7c9dE5F42CaB3481",
    //   "http://127.0.0.1:3000/",
    //   "openid email",
    //   "0xeAa35540a94e3ebdf80448Ae7c9dE5F42CaB3481"
    // );
    const resp = await generateChallenge(
      "0xeAa35540a94e3ebdf80448Ae7c9dE5F42CaB3481",
      "http://127.0.0.1:3000/",
      "openid email",
      smartContractAddress //could be smart contract
    );    
    if (resp.success) {
      const challenge = resp.data.challenge;
      const state = resp.data.state;

      const signature = await signChallenge(
        challenge,
        subOrganizationId,
        walletAddress
      );

      console.log(signature);
      // const parsedStampHeaderValue = JSON.parse(stampResponse.stampHeaderValue);

      // console.log(stampResponse);

      // // Example usage
      // let base64UrlSignature = parsedStampHeaderValue.signature;

      // // Step 1: Convert Base64URL to Base64
      // let base64Signature = base64UrlToBase64(base64UrlSignature);

      // // Step 2: Decode Base64 to Uint8Array (binary data)
      // let signatureBytes = base64ToUint8Array(base64Signature);

      // // Step 3: Convert Uint8Array to hexadecimal string
      // let hexSignature = uint8ArrayToHex(signatureBytes);

      // console.log(hexSignature);

      // console.log(isValidHex(hexSignature));

      if (signature) {
        const jwt = await submitWeb3Challenge(
          "0xeAa35540a94e3ebdf80448Ae7c9dE5F42CaB3481",
          state,
          "http://127.0.0.1:3000/",
          signature
        );
      }
    }
  }

  // Send the token to parent window (assuming popup)
  if (window.opener) {
    window.opener.postMessage(
      { token, authType: "popup" },
      "http://localhost:3001" //TODO: PULL URL FROM ENV
    );
    window.close();
  } else if (window.parent) {
    window.parent.postMessage(
      { token, authType: "embed" },
      "http://localhost:3001" //TODO: PULL URL FROM ENV
    );
  }

  // Trigger success callback
  onSuccess(token);
}


