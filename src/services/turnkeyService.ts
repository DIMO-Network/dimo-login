/**
 * turnkeyService.ts
 *
 * This service handles all actions dependent on turnkey
 * using the Turnkey Client Libraries, or custom Dimo SDK's such as the transactions SDK
 *
 * Specific Responsibilities include: Signing Messages, Triggering OTP's etc
 */

import {
  ContractType,
  KernelSigner,
  MintVehicleWithDeviceDefinition,
  newKernelConfig,
  sacdPermissionValue,
  SetVehiclePermissions,
  SetVehiclePermissionsBulk,
  TransactionData,
} from "@dimo-network/transactions";
import { getWebAuthnAttestation } from "@turnkey/http";
import { IframeStamper } from "@turnkey/iframe-stamper";
import { WebauthnStamper } from "@turnkey/webauthn-stamper";
import { base64UrlEncode, generateRandomBuffer } from "../utils/authUtils";

const stamper = new WebauthnStamper({
  rpId:
    process.env.REACT_APP_ENVIRONMENT == "prod"
      ? "dimo.org"
      : window.location.hostname, //TODO: Pull from ENV based on prod or dev
});

let kernelSigner: KernelSigner;

export const createKernelSigner = (
  clientId: string,
  domain: string,
  redirectUri: string
) => {
  const kernelSignerConfig = newKernelConfig({
    rpcUrl: process.env.REACT_APP_POLYGON_RPC_URL!,
    bundlerUrl: process.env.REACT_APP_ZERODEV_BUNDLER_URL!,
    paymasterUrl: process.env.REACT_APP_ZERODEV_PAYMASTER_URL!,
    environment: process.env.REACT_APP_ENVIRONMENT,
    useWalletSession: true,
    clientId,
    domain,
    redirectUri,
  });

  kernelSigner = new KernelSigner(kernelSignerConfig);
  return kernelSigner;
};

export const getSmartContractAddress = (): `0x${string}` | undefined => {
  return kernelSigner.kernelAddress;
}

export const getWalletAddress = (): `0x${string}` | undefined => {
  return kernelSigner.walletAddress;
}

export const createPasskey = async (email: string) => {
  const challenge = generateRandomBuffer();
  const authenticatorUserId = generateRandomBuffer();

  // An example of possible options can be found here:
  // https://www.w3.org/TR/webauthn-2/#sctn-sample-registration
  const attestation = await getWebAuthnAttestation({
    publicKey: {
      rp: {
        id:
          process.env.REACT_APP_ENVIRONMENT == "prod"
            ? "dimo.org"
            : window.location.hostname, //TODO: Pull from ENV based on prod or dev
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

export const initializePasskey = async (subOrganizationId: string) => {
  await kernelSigner.passkeyToSession(subOrganizationId, stamper);
};

export const openSessionWithPasskey = async () => {
  return await kernelSigner.openSessionWithPasskey();
};

export const initializeIfNeeded = async (subOrganizationId: string) => {
  try {
    await kernelSigner.getActiveClient();
  } catch (e) {
    await initializePasskey(subOrganizationId);
  }
};

export const signChallenge = async (challenge: string) => {
  //This is triggering a turnkey API request to sign a raw payload
  //Notes on signature, turnkey api returns an ecdsa signature, which the kernel client is handling
  const signature = await kernelSigner.signChallenge(challenge);

  return signature;
};

// Helper function to generate IPFS sources for one or more vehicles
export const generateIpfsSources = async (
  tokenIds: bigint[],
  permissions: any,
  clientId: string,
  expiration: BigInt
) => {
  // Bulk vehicles
  const ipfsRes = await kernelSigner.signAndUploadSACDAgreement({
    driverID: clientId,
    appID: clientId,
    appName: "dimo-login", //TODO: Should be a constant, if we're assuming the same appName (however feels like this should be provided by the developer)
    expiration: expiration,
    permissions: permissions,
    grantee: clientId as `0x${string}`,
    attachments: [],
    grantor: kernelSigner.smartContractAddress!,
  });

  return `ipfs://${ipfsRes.cid}`;
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
    source,
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

export async function setVehiclePermissionsBulk(
  tokenIds: BigInt[],
  grantee: `0x${string}`,
  permissions: BigInt,
  expiration: BigInt,
  source: string
): Promise<void> {
  // Construct the payload in the format required by the SDK function
  const payload: SetVehiclePermissionsBulk = {
    tokenIds,
    grantee,
    permissions,
    expiration,
    source,
  };

  try {
    // Call the kernelClient's setVehiclePermissions with the prepared payload
    await kernelSigner.setVehiclePermissionsBulk(payload);
    console.log("Vehicle permissions set successfully");
  } catch (error) {
    console.error("Error setting vehicle permissions:", error);
    throw error;
  }
}

export async function executeAdvancedTransaction(
  address: `0x${string}`,
  value: BigInt,
  abi: any,
  functionName: string,
  args: any[]

): Promise<`0x${string}`> {

  const payload: TransactionData = {
    address,
    value,
    abi,
    functionName,
    args
  }

  const response = await kernelSigner.executeTransaction({
    requireSignature: false,
    data: [
      {
        address: kernelSigner.contractMapping[ContractType.DIMO_TOKEN].address,
        value,
        abi,
        functionName,
        args,
      },
    ],
  });  

  return response.receipt.transactionHash;
}
