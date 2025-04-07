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
  newKernelConfig,
  sacdDescription,
  sacdPermissionArray,
  sacdPermissionValue,
  SetVehiclePermissions,
  SetVehiclePermissionsBulk,
} from '@dimo-network/transactions';
import { getWebAuthnAttestation } from '@turnkey/http';
import { WebauthnStamper } from '@turnkey/webauthn-stamper';
import { base64UrlEncode, generateRandomBuffer } from "../utils/cryptoUtils";
import { VehcilePermissionDescription } from '@dimo-network/transactions/dist/core/types/args';
import { PasskeyCreationResult } from "../models/resultTypes";

const stamper = new WebauthnStamper({
  rpId: process.env.REACT_APP_RPCID_URL as string,
});

let kernelSigner: KernelSigner;

export const createKernelSigner = (
  clientId: string,
  domain: string,
  redirectUri: string,
): KernelSigner => {
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

export const getKernelSigner = (): KernelSigner => {
  return kernelSigner;
};

export const getKernelSignerClient = async () => {
  return await kernelSigner.getActiveClient();
};

export const getSmartContractAddress = (): `0x${string}` | undefined => {
  return kernelSigner.kernelAddress;
};

export const getWalletAddress = (): `0x${string}` | undefined => {
  return kernelSigner.walletAddress;
};

export const createPasskey = async (email: string): Promise<PasskeyCreationResult> => {
  const challenge = generateRandomBuffer();
  const authenticatorUserId = generateRandomBuffer();

  let authenticatorName = `${email} @ DIMO`;

  if (process.env.REACT_APP_ENVIRONMENT !== 'prod') {
    authenticatorName += ` preview`;
  }

  // An example of possible options can be found here:
  // https://www.w3.org/TR/webauthn-2/#sctn-sample-registration
  const attestation = await getWebAuthnAttestation({
    publicKey: {
      rp: {
        id: process.env.REACT_APP_RPCID_URL, //localhost, or dimo.org
        name: 'Dimo Passkey Wallet',
      },
      challenge,
      pubKeyCredParams: [
        {
          type: 'public-key',
          alg: -7,
        },
      ],
      user: {
        id: authenticatorUserId,
        name: authenticatorName,
        displayName: authenticatorName,
      },
      authenticatorSelection: {
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'preferred',
      },
    },
  });

  return [attestation, base64UrlEncode(challenge)];
};

export const initializePasskey = async (subOrganizationId: string): Promise<void> => {
  await kernelSigner.passkeyToSession(subOrganizationId, stamper);
};

export const initializeIfNeeded = async (subOrganizationId: string): Promise<void> => {
  try {
    await kernelSigner.getActiveClient();
  } catch (e) {
    await initializePasskey(subOrganizationId);
    console.log(kernelSigner.walletAddress);
  }
};

export const signChallenge = async (challenge: string): Promise<`0x${string}`> => {
  //This is triggering a turnkey API request to sign a raw payload
  //Notes on signature, turnkey api returns an ecdsa signature, which the kernel client is handling
  const signature = await kernelSigner.signChallenge(challenge);

  return signature;
};

// Helper function to generate IPFS sources for one or more vehicles
export const generateIpfsSources = async (
  permissions: BigInt,
  clientId: string,
  expiration: BigInt,
): Promise<string> => {
  // Bulk vehicles
  const ipfsRes = await kernelSigner.signAndUploadSACDAgreement({
    driverID: clientId,
    appID: clientId,
    appName: 'dimo-login', //TODO: Should be a constant, if we're assuming the same appName (however feels like this should be provided by the developer)
    expiration: expiration,
    permissions: permissions,
    grantee: clientId as `0x${string}`,
    attachments: [],
    grantor: kernelSigner.smartContractAddress!,
  });

  return `ipfs://${ipfsRes.cid}`;
};

// Define the bridge function in your Turnkey Service
export async function setVehiclePermissions({
  tokenId,
  grantee,
  permissions,
  expiration,
  source,
}: SetVehiclePermissions): Promise<void> {
  try {
    // Call the kernelClient's setVehiclePermissions with the prepared payload
    await kernelSigner.setVehiclePermissions({
      tokenId,
      grantee,
      permissions,
      expiration,
      source,
    });
    console.log('Vehicle permissions set successfully');
  } catch (error) {
    console.error('Error setting vehicle permissions:', error);
    throw error;
  }
}

export async function setVehiclePermissionsBulk({
  tokenIds,
  grantee,
  permissions,
  expiration,
  source,
}: SetVehiclePermissionsBulk): Promise<void> {
  try {
    // Call the kernelClient's setVehiclePermissionsBulk with the prepared payload
    await kernelSigner.setVehiclePermissionsBulk({
      tokenIds,
      grantee,
      permissions,
      expiration,
      source,
    });
    console.log('Vehicle permissions set successfully');
  } catch (error) {
    console.error('Error setting vehicle permissions:', error);
    throw error;
  }
}

export async function executeAdvancedTransaction(
  abi: any,
  functionName: string,
  args: any[],
  value?: BigInt,
): Promise<`0x${string}`> {
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

//Exported helpers, to reduce other services to depend on the transactions SDK
export function getSacdValue(
  sacdPerms: Partial<
    Record<
      | 'NONLOCATION_TELEMETRY'
      | 'COMMANDS'
      | 'CURRENT_LOCATION'
      | 'ALLTIME_LOCATION'
      | 'CREDENTIALS'
      | 'STREAMS'
      | 'RAW_DATA'
      | 'APPROXIMATE_LOCATION',
      boolean
    >
  >,
): bigint {
  return sacdPermissionValue(sacdPerms);
}

export function getSacdDescription(args: VehcilePermissionDescription): string {
  return sacdDescription(args);
}

export function getSacdPermissionArray(permissionsObject: bigint): string[] {
  return sacdPermissionArray(permissionsObject);
}
