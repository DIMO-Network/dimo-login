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
  TurnkeyClient,
  getWebAuthnAttestation,
  TurnkeyApiTypes,
  TurnkeyApi,
} from "@turnkey/http";
import { IframeStamper } from "@turnkey/iframe-stamper";
import { WebauthnStamper } from "@turnkey/webauthn-stamper";
import {
  base64UrlEncode,
  bufferToBase64,
  bufferToHex,
  generateRandomBuffer,
  toHexSignature,
} from "../utils/authUtils";
import { verifyEmail } from "./accountsService";
import { keccak256 } from "ethers";
// import { hashMessage } from "viem";
// import { verifyEIP6492Signature } from "@zerodev/sdk";

const stamper = new WebauthnStamper({
  rpId: "ab1a735dff55.ngrok.app",
});

const kernelSignerConfig = newKernelConfig({
  rpcUrl:
    "https://polygon-amoy.g.alchemy.com/v2/-0PsUljNtSdA31-XWj-kL_L1Mx2ArYfS",
  bundlerUrl:
    "https://rpc.zerodev.app/api/v2/bundler/f4d1596a-edfd-4063-8f99-2d8835e07739",
  paymasterUrl:
    "https://rpc.zerodev.app/api/v2/paymaster/f4d1596a-edfd-4063-8f99-2d8835e07739",
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
  const signature = await kernelSigner.kernelClient.signMessage({
    message: challenge,
  });

//   kernelSigner.turnkeyClient?.signRawPayload({
//         type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2" as const, // Force literal string type
//         timestampMs: Date.now().toString(), // Ensure this is a string, since the backend expects it.
//         organizationId, // Example organizationId
//         parameters: {
//           signWith: walletAddress, // Replace with actual address or identifier
//           payload: challenge, // The message you want to sign
//           encoding: "PAYLOAD_ENCODING_TEXT_UTF8" as const, // Use appropriate encoding (UTF-8 or hexadecimal)
//           hashFunction: "HASH_FUNCTION_NO_OP" as const, // Choose the right hash function (e.g., SHA-256 for most general purposes)
//         },
//       })


  return signature;
//   const isValid = await verifyEIP6492Signature({
//     signer: kernelSigner.kernelAddress!,
//     hash: hashMessage(challenge)!,
//     signature: signature,
//     //@ts-ignore
//     client: kernelSigner.publicClient,
//   });

//   console.log(isValid);
  // const resp = await stamper.stamp(challenge);
  // console.log(resp);
  // return resp;

  //   const client = new TurnkeyClient(
  //     {
  //       baseUrl: "https://api.turnkey.com",
  //     },
  //     stamper
  //   );

  //   const { users } = await client.getUsers({
  //     organizationId,
  //   });

  //   console.log(users);
  //   //   TurnkeyApi
  //   //   Turnk

  //   // TurnkeyApiTypes.

  //   const requestBody = {
  //     type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2" as const, // Force literal string type
  //     timestampMs: Date.now().toString(), // Ensure this is a string, since the backend expects it.
  //     organizationId, // Example organizationId
  //     parameters: {
  //       signWith: walletAddress, // Replace with actual address or identifier
  //       payload: challenge, // The message you want to sign
  //       encoding: "PAYLOAD_ENCODING_TEXT_UTF8" as const, // Use appropriate encoding (UTF-8 or hexadecimal)
  //       hashFunction: "HASH_FUNCTION_SHA256" as const, // Choose the right hash function (e.g., SHA-256 for most general purposes)
  //     },
  //   };

  //   console.log(requestBody);

  //   const r = await client.signRawPayload(requestBody);

  //   const signature = r.activity.result.signRawPayloadResult;

  //   if (signature) {
  //     return toHexSignature(signature?.r, signature?.s, signature?.v);
  //   }

  // //   const authenticatorsResponse = await client.getAuthenticators({
  // //     organizationId: subOrganizationId,
  // //   });
  //   const privateKeyResponse = await client.getPrivateKeys({
  //     organizationId: subOrganizationId,
  //   });
};
