/**
 * turnkeyService.ts
 *
 * This service handles all actions dependent on turnkey
 * using the Turnkey Client Libraries, or custom Dimo SDK's such as the transactions SDK
 *
 * Specific Responsibilities include: Signing Messages, Triggering OTP's etc
 */

import {
  KernelSigner,
  MintVehicleWithDeviceDefinition,
  newKernelConfig,
  sacdPermissionValue,
  SetVehiclePermissions,
} from "@dimo-network/transactions";
import {
  getWebAuthnAttestation,
} from "@turnkey/http";
import { IframeStamper } from "@turnkey/iframe-stamper";
import { WebauthnStamper } from "@turnkey/webauthn-stamper";
import {
  base64UrlEncode,
  generateRandomBuffer,
} from "../utils/authUtils";
import { verifyEmail } from "./accountsService";

const stamper = new WebauthnStamper({
  rpId: window.location.hostname,
});

const kernelSignerConfig = newKernelConfig({
  rpcUrl:
    process.env.REACT_APP_POLYGON_RPC_URL!,
  bundlerUrl:
    process.env.REACT_APP_ZERODEV_BUNDLER_URL!,
  paymasterUrl:
    process.env.REACT_APP_ZERODEV_PAYMASTER_URL!,
  environment: process.env.REACT_APP_ENVIRONMENT,
});

let kernelSigner = new KernelSigner(kernelSignerConfig);

export const createPasskey = async (email: string) => {
  const challenge = generateRandomBuffer();
  const authenticatorUserId = generateRandomBuffer();

  // An example of possible options can be found here:
  // https://www.w3.org/TR/webauthn-2/#sctn-sample-registration
  const attestation = await getWebAuthnAttestation({
    publicKey: {
      rp: {
        id: window.location.hostname,
        name: "Dimo Passkey Wallet",
      },
      challenge,
      pubKeyCredParams: [
        {
          type: "public-key",
          alg: -7,
        },
      ],
      user: {
        id: authenticatorUserId,
        name: email,
        displayName: email,
      },
      authenticatorSelection: {
        requireResidentKey: true,
        residentKey: "required",
        userVerification: "preferred",
      },
    },
  });

  return [attestation, base64UrlEncode(challenge)];
};

export const initializePasskey = async (
  subOrganizationId: string,
  walletAddress: string
) => {
  await kernelSigner.passkeyInit(
    subOrganizationId,
    walletAddress as `0x${string}`,
    stamper
  );
};

export const openSessionWithPasskey = async () => {
  return await kernelSigner.openSessionWithPasskey();
}

export const signChallenge = async (
  challenge: string,
  organizationId: string,
  walletAddress: string
) => {

  //This is triggering a turnkey API request to sign a raw payload 
  //Notes on signature, turnkey api returns an ecdsa signature, which the kernel client is handling
  const signature = await kernelSigner.kernelClient.signMessage({
    message: challenge,
  });

  return signature;
};

// Define the bridge function in your Turnkey Service
export async function setVehiclePermissions(
  tokenId: BigInt,
  grantee: `0x${string}`,
  permissions: BigInt,
  expiration: BigInt,
  source: string
): Promise<void> {
  // Construct the payload in the format required by the SDK function
  const payload: SetVehiclePermissions = {
    tokenId,
    grantee,
    permissions,
    expiration,
    source
  };

  try {
    // Call the kernelClient's setVehiclePermissions with the prepared payload
    await kernelSigner.setVehiclePermissions(payload);
    console.log("Vehicle permissions set successfully");
  } catch (error) {
    console.error("Error setting vehicle permissions:", error);
    throw error;
  }
}