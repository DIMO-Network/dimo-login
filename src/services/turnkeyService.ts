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
  Permission,
  sacdDescription,
  SetVehiclePermissions,
  SetVehiclePermissionsBulk,
  SetAccountPermissions,
  setAccountPermissions as sdkSetAccountPermissions,
  setVehiclePermissions as sdkSetVehiclePermissions,
} from '@dimo-network/transactions';
import { setVehiclePermissionsBulk as sdkSetVehiclePermissionsBulk } from '@dimo-network/transactions/dist/core/actions/setPermissionsSACD.js';
import { getWebAuthnAttestation } from '@turnkey/http';
import { WebauthnStamper } from '@turnkey/webauthn-stamper';
import { base64UrlEncode, generateRandomBuffer } from '../utils/cryptoUtils';
import { VehiclePermissionDescription } from '@dimo-network/transactions/dist/core/types/args';
import { PasskeyCreationResult } from '../models/resultTypes';
import { ApiKeyStamper } from '@turnkey/api-key-stamper';
import { uint8ArrayToHexString } from '@turnkey/encoding';
import { decryptCredentialBundle, getPublicKey } from '@turnkey/crypto';
import { Attachment, CloudEventAgreement } from '../types';

export const passkeyStamper = new WebauthnStamper({
  rpId: process.env.REACT_APP_RPCID_URL as string,
});

let kernelSigner: KernelSigner;

export type TurnkeySessionData =
  | {
      sessionType: 'api_key';
      embeddedKey: string;
      credentialBundle: string;
    }
  | { sessionType: 'passkey' };

export type TurnkeySessionDataWithExpiry = TurnkeySessionData & {
  expiresAt: number;
};

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
  await kernelSigner.passkeyToSession(subOrganizationId, passkeyStamper);
};

export const getApiKeyStamper = (args: {
  credentialBundle: string;
  embeddedKey: string;
}) => {
  const privateKey = decryptCredentialBundle(args.credentialBundle, args.embeddedKey);
  const publicKey = uint8ArrayToHexString(getPublicKey(privateKey, true));
  return new ApiKeyStamper({
    apiPublicKey: publicKey,
    apiPrivateKey: privateKey, // Already a hex string from decryptCredentialBundle
  });
};

export const signChallenge = async (challenge: string): Promise<`0x${string}`> => {
  //This is triggering a turnkey API request to sign a raw payload
  //Notes on signature, turnkey api returns an ecdsa signature, which the kernel client is handling
  const signature = await kernelSigner.signChallenge(challenge);

  return signature;
};

// Helper function to generate IPFS sources for one or more vehicles
export const generateIpfsSources = async (
  permissions: Permission[],
  clientId: `0x${string}` | null,
  expiration: BigInt,
  attachments: Attachment[] = [],
  cloudEventAgreements?: CloudEventAgreement[],
  dataversion?: string,
): Promise<string> => {
  // DEBUG-SACD: Log all parameters for SACD generation
  console.log('🔵 DEBUG-SACD: generateIpfsSources called with:');
  console.log('  - permissions:', permissions);
  console.log('  - clientId:', clientId);
  console.log('  - expiration:', expiration.toString());
  console.log('  - attachments:', attachments);
  console.log('  - cloudEventAgreements:', cloudEventAgreements);
  console.log('  - dataversion:', dataversion);

  // Bulk vehicles
  const ipfsRes = await kernelSigner.signAndUploadSACDAgreement({
    expiration: expiration,
    permissions: permissions,
    grantee: clientId as `0x${string}`,
    attachments: attachments,
    grantor: kernelSigner.smartContractAddress!,
    // TODO: Add the asset based on the user
    asset: 'did:',
    ...(cloudEventAgreements && { cloudEventAgreements }),
    ...(dataversion && { dataversion }),
  });

  // DEBUG-SACD: Log IPFS upload result
  console.log('🟢 DEBUG-SACD: SACD uploaded to IPFS:', {
    cid: ipfsRes.cid,
    fullSource: `ipfs://${ipfsRes.cid}`,
  });

  return `ipfs://${ipfsRes.cid}`;
};

// Define the bridge function in your Turnkey Service
export async function setVehiclePermissions(args: SetVehiclePermissions): Promise<void> {
  try {
    const client = await kernelSigner.getActiveClient();
    const environment = process.env.REACT_APP_ENVIRONMENT;

    // Call the SDK's setVehiclePermissions with the client
    await sdkSetVehiclePermissions(args, client, environment);
    console.log('Vehicle permissions set successfully');
  } catch (error) {
    console.error('Error setting vehicle permissions:', error);
    throw error;
  }
}

export async function setVehiclePermissionsBulk(args: SetVehiclePermissionsBulk): Promise<void> {
  try {
    const client = await kernelSigner.getActiveClient();
    const environment = process.env.REACT_APP_ENVIRONMENT;

    // Call the SDK's setVehiclePermissionsBulk with the client
    await sdkSetVehiclePermissionsBulk(args, client, environment);
    console.log('Vehicle permissions set successfully');
  } catch (error) {
    console.error('Error setting vehicle permissions:', error);
    throw error;
  }
}

export async function setAccountPermissions(args: SetAccountPermissions): Promise<void> {
  try {
    // DEBUG-SACD: Log account permissions parameters
    console.log('🔵 DEBUG-SACD: setAccountPermissions called with:', {
      grantee: args.grantee,
      permissions: args.permissions,
      expiration: args.expiration.toString(),
      templateId: args.templateId.toString(),
      source: args.source,
    });

    const client = await kernelSigner.getActiveClient();
    const environment = process.env.REACT_APP_ENVIRONMENT;

    // Call the SDK's setAccountPermissions with the client
    await sdkSetAccountPermissions(args, client, environment);

    // DEBUG-SACD: Log success
    console.log('🟢 DEBUG-SACD: Account permissions set successfully');
  } catch (error) {
    console.error('🔴 DEBUG-SACD: Error setting account permissions:', error);
    throw error;
  }
}

// Parse the bigint values
function parseParameters(rawValues: string[]): (string | bigint)[] {
  return rawValues.map((v) => {
    if (/^-?\d+$/.test(v)) {
      return BigInt(v);
    }
    return v;
  });
}

function parseValue(rawValue?: bigint): BigInt {
  if (!rawValue) return BigInt(0);
  return BigInt(rawValue);
}

export async function executeAdvancedTransaction(
  address: `0x${string}`,
  abi: any,
  functionName: string,
  args: any[],
  value?: bigint,
): Promise<`0x${string}`> {
  const response = await kernelSigner.executeTransaction({
    requireSignature: false,
    data: {
      address: address,
      value: parseValue(value!),
      abi: abi,
      functionName: functionName,
      args: parseParameters(args),
    },
  });

  return response.receipt.transactionHash;
}

export function getSacdDescription(args: VehiclePermissionDescription): string {
  return sacdDescription(args);
}
