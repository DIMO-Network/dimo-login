import React, { useEffect, useRef, useState } from 'react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import { UiStates } from '../../enums';
import { executeTransactionWithReceipt, executeBatchTransactions } from '../../services/turnkeyService';
import { sendMessageToReferrer, backToThirdParty } from '../../utils/messageHandler';
import { ErrorMessage, Header, PrimaryButton, UIManagerLoaderWrapper } from '../Shared';
import { captureException } from '@sentry/react';
import { getFirstOwnedDeveloperLicense } from '../../services/identityService';

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

const ISSUED_EVENT_TOPIC = '0x7533f62ec6601bf9c87f8d96bf756b4b495e2a0e26ec9284e4927926ed6b3afd';

function parseIssuedEvent(logs: any[]): { tokenId: number; clientId: `0x${string}` } | null {
  for (const log of logs) {
    if (log.topics?.[0]?.toLowerCase() === ISSUED_EVENT_TOPIC && log.topics.length >= 4) {
      return {
        tokenId: Number(BigInt(log.topics[1])),
        clientId: `0x${log.topics[3].slice(-40)}` as `0x${string}`,
      };
    }
  }
  return null;
}

function buildAlias(email: string, devLicenseAlias: string): string {
  if (email) return email;
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${devLicenseAlias} - ${date} ${time}`;
}

type Step = 'idle' | 'step1' | 'step2' | 'done' | 'error';

export const ProvisionDeveloperLicense: React.FC = () => {
  const { redirectUri, utm, devLicenseAlias, existingTokenId, existingClientId } = useDevCredentials();
  const { user } = useAuthContext();
  const { setUiState, error, setError } = useUIManager();

  const [step, setStep] = useState<Step>('idle');
  const [tokenId, setTokenId] = useState<number | null>(existingTokenId ?? null);
  const [clientId, setClientId] = useState<string | null>(existingClientId ?? null);

  // Generated once on mount — never sent anywhere except back to the app in the response
  const keyRef = useRef<{ privateKey: `0x${string}`; address: `0x${string}` } | null>(null);
  if (!keyRef.current) {
    const pk = generatePrivateKey();
    keyRef.current = { privateKey: pk, address: privateKeyToAccount(pk).address };
  }

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runProvision();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alias = buildAlias(user.email, devLicenseAlias);
  const { privateKey, address: signerAddress } = keyRef.current!;

  const runStep2 = async (tid: number, cid: string) => {
    setStep('step2');
    await executeBatchTransactions([
      {
        address: DEV_LICENSE_ADDRESS,
        abi: DEV_LICENSE_ABI,
        functionName: 'enableSigner',
        args: [BigInt(tid), signerAddress],
      },
      {
        address: DEV_LICENSE_ADDRESS,
        abi: DEV_LICENSE_ABI,
        functionName: 'setRedirectUri',
        args: [BigInt(tid), true, redirectUri],
      },
    ]);

    // privateKey is delivered only via origin-pinned postMessage (popup/embed).
    // Redirect mode receives tokenId + clientId only — the private key must not
    // travel in a URL (server logs, browser history, Referer headers).
    sendMessageToReferrer({ eventType: 'provisionResponse', tokenId: tid, clientId: cid, privateKey }, redirectUri);
    backToThirdParty({ tokenId: tid, clientId: cid }, redirectUri, utm);
    setStep('done');
    setUiState(UiStates.SUCCESS);
  };

  const runProvision = async () => {
    try {
      if (existingTokenId != null && existingClientId) {
        await runStep2(existingTokenId, existingClientId);
        return;
      }

      // Check if the authenticated user already owns a developer license before minting
      if (user.smartContractAddress && user.smartContractAddress !== '0x') {
        const existing = await getFirstOwnedDeveloperLicense(user.smartContractAddress);
        if (existing) {
          await runStep2(existing.tokenId, existing.clientId);
          return;
        }
      }

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
    step === 'step1' ? 'Step 1 of 2: Minting your developer license…'
    : step === 'step2' ? 'Step 2 of 2: Registering API key and redirect URI…'
    : step === 'done' ? 'Done!'
    : 'Setting up your developer license…';

  return (
    <UIManagerLoaderWrapper>
      <Header title="Developer License" subtitle="Setting up API access for this app" />
      {error && <ErrorMessage message={error} />}

      <div className="flex flex-col gap-4 w-full text-sm">
        <p className="text-gray-600">{stepLabel}</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${step === 'step1' ? 'bg-blue-500 animate-pulse' : step !== 'idle' ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className={step !== 'idle' ? 'text-gray-900' : 'text-gray-400'}>Mint developer license</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${step === 'step2' ? 'bg-blue-500 animate-pulse' : step === 'done' ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className={step === 'step2' || step === 'done' ? 'text-gray-900' : 'text-gray-400'}>Register API key &amp; redirect URI</span>
          </div>
        </div>
      </div>

      {step === 'error' && tokenId != null && (
        <div className="flex justify-end w-full pt-4">
          <PrimaryButton onClick={retryStep2} width="w-[214px]">Retry</PrimaryButton>
        </div>
      )}
    </UIManagerLoaderWrapper>
  );
};

export default ProvisionDeveloperLicense;
