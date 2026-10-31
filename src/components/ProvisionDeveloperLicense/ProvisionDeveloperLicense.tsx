import React, { useEffect, useRef, useState } from 'react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import { UiStates } from '../../enums';
import { executeTransactionWithReceipt, executeBatchTransactions } from '../../services/turnkeyService';
import { sendMessageToReferrer, backToThirdParty } from '../../utils/messageHandler';
import { sendErrorToParent } from '../../utils/errorUtils';
import { getRedirectHost } from '../../utils/urlHelpers';
import { captureException } from '@sentry/react';
import { useT } from '../../i18n';
import { ActionBar, Button, ErrorBox, Screen, ScreenHeader } from '../ui';
import { cn } from '../ui/cn';
import {
  getDeveloperLicense,
  getFirstOwnedDeveloperLicense,
} from '../../services/identityService';

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

type Step =
  | 'checking'
  | 'confirm'
  | 'step1'
  | 'step2'
  | 'done'
  | 'error'
  | 'existing_prompt';

const sameAddress = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

const StepRow = ({ state, label }: { state: 'todo' | 'active' | 'done'; label: string }) => (
  <li className="flex items-center gap-2.5 text-body-sm">
    <span
      aria-hidden="true"
      className={cn(
        'size-2 shrink-0 rounded-full',
        state === 'active' && 'animate-pulse bg-accent',
        state === 'done' && 'bg-positive',
        state === 'todo' && 'bg-outline-strong',
      )}
    />
    <span className={state === 'todo' ? 'text-muted' : 'text-ink'}>{label}</span>
  </li>
);

export const ProvisionDeveloperLicense: React.FC = () => {
  const t = useT();
  const { redirectUri, utm, devLicenseAlias, existingTokenId, existingClientId } = useDevCredentials();
  const { user, validateSession } = useAuthContext();
  const { setUiState } = useUIManager();
  // Who gets the key: the redirect URI's host, which the key is posted to.
  const host = getRedirectHost(redirectUri);
  const rotating = existingTokenId != null && !!existingClientId;
  // Shown under a translated line; the underlying reason stays as is.
  const [error, setError] = useState('');

  const [step, setStep] = useState<Step>('checking');
  const [tokenId, setTokenId] = useState<number | null>(existingTokenId ?? null);
  const [clientId, setClientId] = useState<string | null>(existingClientId ?? null);
  const [skipMint, setSkipMint] = useState(existingTokenId != null);
  // Redirect URIs already registered on the existing license (populated when we detect one).
  const [registeredUris, setRegisteredUris] = useState<string[]>([]);
  // The existing license's name, for the confirm screen.
  const [licenseLabel, setLicenseLabel] = useState(existingClientId ?? '');

  // Generated once on mount — never sent anywhere except back to the app in the response
  const keyRef = useRef<{ privateKey: `0x${string}`; address: `0x${string}` } | null>(null);
  if (!keyRef.current) {
    const pk = generatePrivateKey();
    keyRef.current = { privateKey: pk, address: privateKeyToAccount(pk).address };
  }

  // Nothing is signed until the user agrees: any page can open this flow, and
  // a key or redirect address given to the wrong site hands it the license.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alias = buildAlias(user.email, devLicenseAlias);
  const { privateKey, address: signerAddress } = keyRef.current!;

  const needsRedirectUri = (knownUris: string[]) =>
    Boolean(redirectUri) && !knownUris.includes(redirectUri);

  const runStep2 = async (tid: number, cid: string, knownUris: string[] = []) => {
    setStep('step2');
    const calls: Array<{ address: `0x${string}`; abi: any; functionName: string; args: any[] }> = [
      {
        address: DEV_LICENSE_ADDRESS,
        abi: DEV_LICENSE_ABI,
        functionName: 'enableSigner',
        args: [BigInt(tid), signerAddress],
      },
    ];
    if (needsRedirectUri(knownUris)) {
      calls.push({
        address: DEV_LICENSE_ADDRESS,
        abi: DEV_LICENSE_ABI,
        functionName: 'setRedirectUri',
        args: [BigInt(tid), true, redirectUri],
      });
    }
    await executeBatchTransactions(calls);

    // privateKey is delivered only via origin-pinned postMessage (popup/embed).
    // Redirect mode receives tokenId + clientId only — the private key must not
    // travel in a URL (server logs, browser history, Referer headers).
    const strippedKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    sendMessageToReferrer({ eventType: 'provisionResponse', tokenId: tid, clientId: cid, privateKey: strippedKey }, redirectUri);
    backToThirdParty({ tokenId: tid, clientId: cid }, redirectUri, utm);
    setStep('done');
    setUiState(UiStates.SUCCESS);
  };

  // User already has a license and confirms they have their API key.
  // Register the redirectUri if it isn't already on-chain, then send back
  // clientId only so the calling app can pre-fill it and the user pastes their key.
  const handleHasExistingKey = async () => {
    if (tokenId == null || clientId == null) return;
    setError('');
    const validSession = await validateSession();
    if (!validSession) return;
    try {
      if (needsRedirectUri(registeredUris)) {
        setStep('step2');
        await executeBatchTransactions([{
          address: DEV_LICENSE_ADDRESS,
          abi: DEV_LICENSE_ABI,
          functionName: 'setRedirectUri',
          args: [BigInt(tokenId), true, redirectUri],
        }]);
      }
      sendMessageToReferrer({ eventType: 'provisionResponse', tokenId, clientId }, redirectUri);
      backToThirdParty({ tokenId, clientId }, redirectUri, utm);
      setStep('done');
      setUiState(UiStates.SUCCESS);
    } catch (e) {
      console.error('[ProvisionDeveloperLicense] handleHasExistingKey failed:', e);
      captureException(e);
      setStep('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // User already has a license but no API key — generate a new one and register it.
  const handleGenerateNewKey = async () => {
    if (tokenId == null || clientId == null) return;
    setError('');
    const validSession = await validateSession();
    if (!validSession) return;
    try {
      await runStep2(tokenId, clientId, registeredUris);
    } catch (e) {
      console.error('[ProvisionDeveloperLicense] handleGenerateNewKey failed:', e);
      captureException(e);
      setStep('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Works out what Continue would do, without signing anything.
  const prepare = async () => {
    try {
      if (!host) {
        setStep('error');
        setError(t('license.no_redirect_uri'));
        return;
      }
      if (rotating) {
        // A new key for a license the app names: it must be this account's.
        const license = await getDeveloperLicense(existingClientId!);
        if (!license || !sameAddress(license.owner, user.smartContractAddress)) {
          setTokenId(null); // nothing to retry on someone else's license
          setStep('error');
          setError(t('license.not_owner'));
          return;
        }
        setRegisteredUris(
          license.redirectURIs?.nodes?.map((n: { uri: string }) => n.uri) ?? [],
        );
        if (license.alias) setLicenseLabel(license.alias);
        setStep('confirm');
        return;
      }

      // Check if the authenticated user already owns a developer license before minting.
      // If so, ask whether they have an existing API key rather than auto-generating one.
      if (user.smartContractAddress && user.smartContractAddress !== '0x') {
        const existing = await getFirstOwnedDeveloperLicense(user.smartContractAddress);
        if (existing) {
          setTokenId(existing.tokenId);
          setClientId(existing.clientId);
          setRegisteredUris(existing.redirectUris);
          setSkipMint(true);
          setStep('existing_prompt');
          return;
        }
      }
      setStep('confirm');
    } catch (e) {
      console.error('[ProvisionDeveloperLicense] prepare failed:', e);
      captureException(e);
      setStep('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleCancel = () =>
    sendErrorToParent(
      'User cancelled developer license setup',
      redirectUri,
      utm,
      setUiState,
    );

  const runProvision = async () => {
    try {
      const validSession = await validateSession();
      if (!validSession) return;

      if (rotating) {
        await runStep2(existingTokenId!, existingClientId!, registeredUris);
        return;
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
      await runStep2(parsed.tokenId, parsed.clientId, []);
    } catch (e) {
      console.error('[ProvisionDeveloperLicense] runProvision failed:', e);
      captureException(e);
      setStep('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const retryStep2 = async () => {
    if (tokenId == null || clientId == null) return;
    setError('');
    try {
      await runStep2(tokenId, clientId, registeredUris);
    } catch (e) {
      console.error('[ProvisionDeveloperLicense] retryStep2 failed:', e);
      captureException(e);
      setStep('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const errorBox = step === 'error' && (
    <ErrorBox title={t('license.error')}>
      {error && (
        <span className="text-label font-normal text-muted">
          {t('common.error_detail', { detail: error })}
        </span>
      )}
    </ErrorBox>
  );

  const redirectNote = needsRedirectUri(registeredUris) && (
    <p className="text-body-sm text-fg wrap-anywhere">
      {t(step === 'confirm' ? 'license.confirm.redirect' : 'license.existing.redirect', {
        uri: redirectUri,
      })}
    </p>
  );
  const warning = (
    <p className="text-label font-normal text-muted">
      {t('license.confirm.warning', { host })}
    </p>
  );

  if (step === 'confirm') {
    return (
      <Screen
        actions={
          <ActionBar>
            <Button variant="secondary" onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void runProvision()}>{t('common.continue')}</Button>
          </ActionBar>
        }
      >
        <ScreenHeader
          title={t('license.title')}
          subtitle={t('license.confirm.subtitle', { host })}
        />
        <section className="flex flex-col gap-2 rounded-card bg-card px-4 py-3.5">
          <p className="text-body-sm text-fg wrap-anywhere">
            {rotating
              ? t('license.confirm.new_key', { host, license: licenseLabel })
              : t('license.confirm.key', { host })}
          </p>
          {redirectNote}
        </section>
        {warning}
      </Screen>
    );
  }

  if (step === 'existing_prompt') {
    return (
      <Screen
        actions={
          <ActionBar className="[&>div]:flex-col">
            <Button fullWidth onClick={handleHasExistingKey}>
              {t('license.existing.has_key')}
            </Button>
            <Button variant="ghost" fullWidth onClick={handleGenerateNewKey}>
              {t('license.existing.new_key')}
            </Button>
            <Button variant="ghost" fullWidth onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
          </ActionBar>
        }
      >
        <ScreenHeader title={t('license.title')} subtitle={t('license.existing.subtitle')} />
        {errorBox}
        <p className="text-body-sm text-fg wrap-anywhere">
          {t('license.existing.body', { host, clientId: clientId ?? '' })}
        </p>
        {redirectNote}
        {warning}
      </Screen>
    );
  }

  const status =
    step === 'step1'
      ? t('license.status.minting')
      : step === 'step2'
        ? skipMint
          ? t('license.status.generating')
          : t('license.status.registering')
        : step === 'done'
          ? t('license.status.done')
          : t('license.status.starting');

  return (
    <Screen
      actions={
        step === 'error' ? (
          <ActionBar>
            {tokenId != null ? (
              <Button fullWidth onClick={retryStep2}>
                {t('common.try_again')}
              </Button>
            ) : (
              <Button variant="secondary" fullWidth onClick={handleCancel}>
                {t('common.cancel')}
              </Button>
            )}
          </ActionBar>
        ) : undefined
      }
    >
      <ScreenHeader
        title={t('license.title')}
        subtitle={t('license.subtitle', { appName: devLicenseAlias })}
      />
      {errorBox}
      {/* After an error the box says what happened; a "Setting up…" card
          under it would say the opposite. Try again brings it back. */}
      {step !== 'error' && (
        <section className="flex flex-col gap-3 rounded-card bg-card px-4 py-3.5">
          <p className="text-body-sm text-fg" role="status">
            {status}
          </p>
          <ol className="flex flex-col gap-2">
            {!skipMint && (
              <StepRow
                state={
                  step === 'step1'
                    ? 'active'
                    : step === 'step2' || step === 'done'
                      ? 'done'
                      : 'todo'
                }
                label={t('license.step.mint')}
              />
            )}
            <StepRow
              state={step === 'step2' ? 'active' : step === 'done' ? 'done' : 'todo'}
              label={t('license.step.register')}
            />
          </ol>
        </section>
      )}
    </Screen>
  );
};

export default ProvisionDeveloperLicense;
