import React, { useEffect, useRef, useState } from 'react';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import { UiStates } from '../../enums';
import { executeTransactionWithReceipt, executeBatchTransactions } from '../../services/turnkeyService';
import { sendMessageToReferrer, backToThirdParty } from '../../utils/messageHandler';
import { ErrorMessage, Header, PrimaryButton, UIManagerLoaderWrapper } from '../Shared';
import { captureException } from '@sentry/react';

// DEV_LICENSE_ADDRESS and DEV_LICENSE_ABI copied from dimo-driver/src/constants/devLicense.ts
const isProd = process.env.REACT_APP_ENVIRONMENT === 'prod';

const DEV_LICENSE_ADDRESS: `0x${string}` = isProd
  ? '0x9A9D2E717bB005B240094ba761Ff074d392C7C85'
  : '0xdb6c0dBbaf48b9D9Bcf5ca3C45cFF3811D70eD96';

const DEV_LICENSE_ABI = [
  {
    type: 'function',
    name: 'issueInDimo',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'licenseAlias', type: 'string' }],
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'clientId', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'enableSigner',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'signer', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setRedirectUri',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'enabled', type: 'bool' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Issued',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'clientId', type: 'address' },
    ],
  },
] as const;

// Keccak256 of "Issued(uint256,address,address)" — used to identify the event in logs.
// Precomputed so we don't need a crypto lib at runtime.
const ISSUED_EVENT_TOPIC = '0x7533f62ec6601bf9c87f8d96bf756b4b495e2a0e26ec9284e4927926ed6b3afd';

function parseIssuedEvent(logs: any[]): { tokenId: number; clientId: `0x${string}` } | null {
  for (const log of logs) {
    if (
      log.topics &&
      log.topics[0]?.toLowerCase() === ISSUED_EVENT_TOPIC &&
      log.topics.length >= 4
    ) {
      const tokenId = Number(BigInt(log.topics[1]));
      const clientId = `0x${log.topics[3].slice(-40)}` as `0x${string}`;
      return { tokenId, clientId };
    }
  }
  return null;
}

type Step = 'idle' | 'step1' | 'step2' | 'done' | 'error';

export const ProvisionDeveloperLicense: React.FC = () => {
  const { provisionData } = useDevCredentials();
  const { user } = useAuthContext();
  const { setUiState, error, setError } = useUIManager();

  const [step, setStep] = useState<Step>('idle');
  const [tokenId, setTokenId] = useState<number | null>(
    provisionData?.existingTokenId ?? null,
  );
  const [clientId, setClientId] = useState<string | null>(
    provisionData?.existingClientId ?? null,
  );

  // Guard against double-mount in React StrictMode
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runProvision();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alias = user.email || provisionData?.alias || 'DIMO App';

  const runStep2 = async (tid: number, cid: string) => {
    setStep('step2');
    await executeBatchTransactions([
      {
        address: DEV_LICENSE_ADDRESS,
        abi: DEV_LICENSE_ABI,
        functionName: 'enableSigner',
        args: [BigInt(tid), provisionData!.signerAddress],
      },
      {
        address: DEV_LICENSE_ADDRESS,
        abi: DEV_LICENSE_ABI,
        functionName: 'setRedirectUri',
        args: [BigInt(tid), true, provisionData!.domain],
      },
    ]);

    sendMessageToReferrer({
      eventType: 'provisionResponse',
      tokenId: tid,
      clientId: cid,
    });
    backToThirdParty({ tokenId: tid, clientId: cid }, provisionData!.domain, '');
    setStep('done');
    setUiState(UiStates.SUCCESS);
  };

  const runProvision = async () => {
    try {
      // Existing license path — skip minting
      if (provisionData?.existingTokenId != null && provisionData?.existingClientId) {
        await runStep2(provisionData.existingTokenId, provisionData.existingClientId);
        return;
      }

      // STEP 1: mint the license
      setStep('step1');
      const { logs } = await executeTransactionWithReceipt(
        DEV_LICENSE_ADDRESS,
        DEV_LICENSE_ABI,
        'issueInDimo',
        [alias],
      );

      const parsed = parseIssuedEvent(logs);
      if (!parsed) throw new Error('Issued event not found in transaction receipt');

      setTokenId(parsed.tokenId);
      setClientId(parsed.clientId);

      // STEP 2: register signer + redirect URI
      await runStep2(parsed.tokenId, parsed.clientId);
    } catch (e) {
      captureException(e);
      setStep('error');
      setError(e instanceof Error ? e.message : 'Could not provision developer license');
    }
  };

  const retryStep2 = async () => {
    if (tokenId == null || clientId == null) return;
    setError('');
    try {
      await runStep2(tokenId, clientId);
    } catch (e) {
      captureException(e);
      setStep('error');
      setError(e instanceof Error ? e.message : 'Could not complete setup');
    }
  };

  const stepLabel =
    step === 'step1'
      ? 'Step 1 of 2: Minting your developer license…'
      : step === 'step2'
        ? 'Step 2 of 2: Registering API key and redirect URI…'
        : step === 'done'
          ? 'Done!'
          : 'Setting up your developer license…';

  return (
    <UIManagerLoaderWrapper>
      <Header title="Developer License" subtitle="Setting up API access for this app" />
      {error && <ErrorMessage message={error} />}

      <div className="flex flex-col gap-4 w-full text-sm">
        <p className="text-gray-600">{stepLabel}</p>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                step === 'step1' ? 'bg-blue-500 animate-pulse' : step !== 'idle' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className={step !== 'idle' ? 'text-gray-900' : 'text-gray-400'}>
              Mint developer license
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                step === 'step2' ? 'bg-blue-500 animate-pulse' : step === 'done' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className={step === 'step2' || step === 'done' ? 'text-gray-900' : 'text-gray-400'}>
              Register API key &amp; redirect URI
            </span>
          </div>
        </div>
      </div>

      {/* Retry button only appears when step 2 failed (license already minted) */}
      {step === 'error' && tokenId != null && (
        <div className="flex justify-end w-full pt-4">
          <PrimaryButton onClick={retryStep2} width="w-[214px]">
            Retry
          </PrimaryButton>
        </div>
      )}
    </UIManagerLoaderWrapper>
  );
};

export default ProvisionDeveloperLicense;
