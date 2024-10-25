// @ts-ignore
import { TStamper } from "@turnkey/http/dist/base";
import { SmartAccountSigner } from "permissionless/accounts";
import { createPublicClient, createWalletClient, http } from "viem";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  ENTRYPOINT_ADDRESS_V07,
  UserOperation,
  walletClientToSmartAccountSigner,
} from "permissionless";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { TurnkeyClient } from "@turnkey/http";
import { createAccount } from "@turnkey/viem";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { WebauthnStamper } from "@turnkey/webauthn-stamper";
import {  polygonAmoy } from 'viem/chains';

const stamper = new WebauthnStamper({
    rpId: "ab1a735dff55.ngrok.app",
  });

const turnkeyConfig = {
  apiBaseUrl: "https://api.turnkey.com",
  rpcUrl:
    "https://polygon-amoy.g.alchemy.com/v2/-0PsUljNtSdA31-XWj-kL_L1Mx2ArYfS",
  bundlerUrl:
    "https://rpc.zerodev.app/api/v2/bundler/f4d1596a-edfd-4063-8f99-2d8835e07739",
  paymasterUrl:
    "https://rpc.zerodev.app/api/v2/paymaster/f4d1596a-edfd-4063-8f99-2d8835e07739",
  environment: "dev", // omit this to default to prod
};

export interface ISubOrganization {
    subOrganizationId: string;
    emailVerified: boolean;
    walletAddress: `0x${string}`;
    smartContractAddress: `0x${string}`;
    hasPasskey: boolean;
  }

// @ts-ignore
const sponsorUserOperation = async ({ userOperation }) => {
  const chain = polygonAmoy;
  const zerodevPaymaster = createZeroDevPaymasterClient({
    chain: chain,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    transport: http(turnkeyConfig.paymasterUrl),
  });
  return zerodevPaymaster.sponsorUserOperation({
    userOperation,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
  });
};

export const getKernelClient = async ({
  subOrganizationId,
  walletAddress,
}: ISubOrganization) => {
  const chain = polygonAmoy;
  const stamperClient = new TurnkeyClient(
    {
      baseUrl: turnkeyConfig.apiBaseUrl,
    },
    stamper
  );

  const localAccount = await createAccount({
    client: stamperClient,
    organizationId: subOrganizationId,
    signWith: walletAddress,
    ethereumAddress: walletAddress,
  });

  const smartAccountClient = createWalletClient({
    account: localAccount,
    chain: chain,
    transport: http(turnkeyConfig.bundlerUrl),
  });

  const smartAccountSigner =
    walletClientToSmartAccountSigner(smartAccountClient);

  const publicClient = createPublicClient({
    chain: chain,
    transport: http(turnkeyConfig.bundlerUrl),
  });

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: smartAccountSigner,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    kernelVersion: KERNEL_V3_1,
  });

  const zeroDevKernelAccount = await createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    kernelVersion: KERNEL_V3_1,
  });

  const kernelClient = createKernelAccountClient({
    account: zeroDevKernelAccount,
    chain: chain,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    bundlerTransport: http(turnkeyConfig.bundlerUrl),
    middleware: {
      sponsorUserOperation: sponsorUserOperation,
    },
  });

  return kernelClient;
};
