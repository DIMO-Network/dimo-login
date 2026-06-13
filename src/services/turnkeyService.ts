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
  SetAccountPermissions,
  SetVehiclePermissions,
  SetVehiclePermissionsBulk,
} from '@dimo-network/transactions';
import { buildDriverDocAgreements } from './accountDocumentAgreements';
import { getWebAuthnAttestation } from '@turnkey/http';
import { WebauthnStamper } from '@turnkey/webauthn-stamper';
import { base64UrlEncode, generateRandomBuffer } from '../utils/cryptoUtils';
import { VehiclePermissionDescription } from '@dimo-network/transactions/dist/core/types/args';
import { PasskeyCreationResult } from '../models/resultTypes';
import { ApiKeyStamper } from '@turnkey/api-key-stamper';
import { uint8ArrayToHexString } from '@turnkey/encoding';
import { decryptCredentialBundle, getPublicKey } from '@turnkey/crypto';
import { Attachment, CloudEventAgreement } from '../types';
import { withTimeout } from '../utils/withTimeout';

// Bound every KernelSigner call (bundler/paymaster/RPC + user-op receipt). 90s is
// generous for an on-chain user operation but still finite — on expiry the caller
// surfaces an error instead of an eternal spinner. NOTE: the user operation may
// still land on-chain after the timeout; callers should treat expiry as "unknown,
// retry/refresh" rather than "definitely failed".
const KERNEL_OP_TIMEOUT_MS = 90_000;

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
  return await withTimeout(
    kernelSigner.getActiveClient(),
    KERNEL_OP_TIMEOUT_MS,
    'getActiveClient',
  );
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
  // @turnkey/crypto 2.x renamed `decryptBundle` (returned a Uint8Array private
  // key) to `decryptCredentialBundle`, which returns the private key as a hex
  // string. getPublicKey accepts the hex string directly, and the stamper takes
  // the hex private key as-is.
  const privateKey = decryptCredentialBundle(args.credentialBundle, args.embeddedKey);
  const publicKey = uint8ArrayToHexString(getPublicKey(privateKey, true));
  return new ApiKeyStamper({
    apiPublicKey: publicKey,
    apiPrivateKey: privateKey,
  });
};

export const signChallenge = async (challenge: string): Promise<`0x${string}`> => {
  //This is triggering a turnkey API request to sign a raw payload
  //Notes on signature, turnkey api returns an ecdsa signature, which the kernel client is handling
  const signature = await withTimeout(
    kernelSigner.signChallenge(challenge),
    KERNEL_OP_TIMEOUT_MS,
    'signChallenge',
  );

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
  // Bulk vehicles
  const ipfsRes = await withTimeout(
    kernelSigner.signAndUploadSACDAgreement({
      expiration: expiration,
      permissions: permissions,
      grantee: clientId as `0x${string}`,
      attachments: attachments,
      grantor: kernelSigner.smartContractAddress!,
      // TODO: Add the asset based on the user
      asset: 'did:',
      ...(cloudEventAgreements && { cloudEventAgreements }),
      ...(dataversion && { dataversion }),
    }),
    KERNEL_OP_TIMEOUT_MS,
    'signAndUploadSACDAgreement',
  );

  return `ipfs://${ipfsRes.cid}`;
};

// Account-level SACD source: grants document cloudevents on the user's account
// DID (did:ethr:137:<grantor>), not on a vehicle. Mirrors generateIpfsSources but
// carries the driver-document agreements and the correct account asset DID.
export const generateAccountIpfsSource = async (
  permissions: Permission[],
  clientId: `0x${string}` | null,
  expiration: BigInt,
): Promise<string> => {
  const grantor = kernelSigner.smartContractAddress!;
  const ipfsRes = await withTimeout(
    kernelSigner.signAndUploadSACDAgreement({
      expiration,
      permissions,
      grantee: clientId as `0x${string}`,
      attachments: [],
      grantor,
      asset: `did:ethr:137:${grantor}`,
      cloudEventAgreements: buildDriverDocAgreements(grantor),
    }),
    KERNEL_OP_TIMEOUT_MS,
    'signAndUploadSACDAgreement(account)',
  );
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
    await withTimeout(
      kernelSigner.setVehiclePermissions({
        tokenId,
        grantee,
        permissions,
        expiration,
        source,
      }),
      KERNEL_OP_TIMEOUT_MS,
      'setVehiclePermissions',
    );
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
    await withTimeout(
      kernelSigner.setVehiclePermissionsBulk({
        tokenIds,
        grantee,
        permissions,
        expiration,
        source,
      }),
      KERNEL_OP_TIMEOUT_MS,
      'setVehiclePermissionsBulk',
    );
    console.log('Vehicle permissions set successfully');
  } catch (error) {
    console.error('Error setting vehicle permissions:', error);
    throw error;
  }
}

// Account-level SACD grant bridge. templateId is required by the SDK type
// (callers pass 0n for the explicit-permissions + cloudEventAgreements path).
export async function setAccountPermissions({
  grantee,
  permissions,
  expiration,
  templateId,
  source,
}: SetAccountPermissions): Promise<void> {
  try {
    await withTimeout(
      kernelSigner.setAccountPermissions({
        grantee,
        permissions,
        expiration,
        templateId,
        source,
      }),
      KERNEL_OP_TIMEOUT_MS,
      'setAccountPermissions',
    );
    console.log('Account permissions set successfully');
  } catch (error) {
    console.error('Error setting account permissions:', error);
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

export async function signArbitraryMessage(
  message: string,
  isHex: boolean,
): Promise<{ signature: `0x${string}`; signer: `0x${string}` }> {
  const signer = kernelSigner.kernelAddress;
  if (!signer) {
    throw new Error('Kernel address unavailable; user is not authenticated.');
  }

  let signature: `0x${string}`;
  if (isHex) {
    const client = await withTimeout(
      kernelSigner.getActiveClient(),
      KERNEL_OP_TIMEOUT_MS,
      'getActiveClient',
    );
    signature = await withTimeout(
      client.signMessage({ message: { raw: message as `0x${string}` } }),
      KERNEL_OP_TIMEOUT_MS,
      'signMessage',
    );
  } else {
    signature = await withTimeout(
      kernelSigner.signChallenge(message),
      KERNEL_OP_TIMEOUT_MS,
      'signChallenge',
    );
  }

  return { signature, signer };
}

export async function executeAdvancedTransaction(
  address: `0x${string}`,
  abi: any,
  functionName: string,
  args: any[],
  value?: bigint,
): Promise<`0x${string}`> {
  const response = await withTimeout(
    kernelSigner.executeTransaction({
      requireSignature: false,
      data: {
        address: address,
        value: parseValue(value!),
        abi: abi,
        functionName: functionName,
        args: parseParameters(args),
      },
    }),
    KERNEL_OP_TIMEOUT_MS,
    'executeTransaction',
  );

  return response.receipt.transactionHash;
}

export function getSacdDescription(args: VehiclePermissionDescription): string {
  return sacdDescription(args);
}
