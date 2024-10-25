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
  newKernelConfig,
  sacdPermissionValue,
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
  rpId: "ab1a735dff55.ngrok.app", //TODO: Should not be hardcoded
});

const kernelSignerConfig = newKernelConfig({
  rpcUrl:
    "https://polygon-amoy.g.alchemy.com/v2/-0PsUljNtSdA31-XWj-kL_L1Mx2ArYfS", //TODO: Store in ENV
  bundlerUrl:
    "https://rpc.zerodev.app/api/v2/bundler/f4d1596a-edfd-4063-8f99-2d8835e07739", //TODO: Store in ENV
  paymasterUrl:
    "https://rpc.zerodev.app/api/v2/paymaster/f4d1596a-edfd-4063-8f99-2d8835e07739", //TODO: Store in ENV
  environment: "dev", // omit this to default to prod
});

let kernelSigner: KernelSigner;

export const createPasskey = async (email: string) => {
  const challenge = generateRandomBuffer();
  const authenticatorUserId = generateRandomBuffer();

  // An example of possible options can be found here:
  // https://www.w3.org/TR/webauthn-2/#sctn-sample-registration
  const attestation = await getWebAuthnAttestation({
    publicKey: {
      rp: {
        id: "ab1a735dff55.ngrok.app",
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
  kernelSigner = new KernelSigner(kernelSignerConfig);
  await kernelSigner.passkeyInit(
    subOrganizationId,
    walletAddress as `0x${string}`,
    stamper
  );
};

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
