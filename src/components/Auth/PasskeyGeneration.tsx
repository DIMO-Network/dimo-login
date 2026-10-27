import React, { type FC, useState } from 'react';
import { CheckIcon, KeyIcon } from '@heroicons/react/24/outline';

import { useAuthContext } from '../../context/AuthContext';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { ErrorMessage } from '../Shared';
import { LegalNotice } from '../Shared/LegalNotice';
import { createAccount, createPasskey } from '../../services';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { UserObject } from '../../models/user';
import { message, useT } from '../../i18n';
import { ActionBar, Button, DoneHeader, Screen } from '../ui';

interface PasskeyGenerationProps {
  email: string;
}

const BENEFITS = [
  'create.benefit_biometric',
  'create.benefit_nothing_to_remember',
  'create.benefit_phishing',
] as const;

/** A new account: create its passkey, which is how it signs in from now on. */
export const PasskeyGeneration: FC<PasskeyGenerationProps> = ({ email }) => {
  const t = useT();
  const { setUser } = useAuthContext();
  const { setError, error, setUiState, setBusy } = useUIManager();
  const { apiKey, devLicenseAlias, oemBrand, tosUrl, privacyPolicyUrl } =
    useDevCredentials();
  const brandName = oemBrand?.name || devLicenseAlias || undefined;
  // Kept on this screen rather than the shared loader, which would unmount it
  // mid-creation.
  const [creating, setCreating] = useState(false);

  const createAccountWithPasskey = async (email: string): Promise<UserObject> => {
    const [attestation, challenge] = await createPasskey(email);
    return await createAccount({
      email,
      apiKey,
      attestation,
      challenge,
      deployAccount: true,
    });
  };

  const handlePasskeyGeneration = async () => {
    try {
      setError(null);
      setCreating(true);
      setBusy(true);
      const newAccount = await createAccountWithPasskey(email);
      setUser(newAccount);
      setUiState(UiStates.PASSKEY_LOGIN);
    } catch (err) {
      setError(message('create.error'));
    } finally {
      setCreating(false);
      setBusy(false);
    }
  };

  const actions = (
    <ActionBar hint={creating ? t('create.creating') : undefined}>
      <Button
        fullWidth
        onClick={handlePasskeyGeneration}
        loading={creating}
        loadingLabel={t('create.cta')}
      >
        {t('create.cta')}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <DoneHeader
        tone="ink"
        icon={<KeyIcon className="size-[26px]" />}
        title={t('create.title')}
      >
        {t('create.body')}
      </DoneHeader>
      {error && <ErrorMessage message={error} />}
      <ul className="flex flex-col gap-2.5 rounded-card bg-card px-4 py-3.5">
        {BENEFITS.map((key) => (
          <li key={key} className="flex items-start gap-2.5 text-body-sm text-fg">
            <CheckIcon
              className="mt-0.5 size-4 shrink-0 text-positive"
              aria-hidden="true"
            />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
      <p className="text-label font-normal text-muted">{email}</p>
      <LegalNotice
        tosUrl={tosUrl}
        privacyPolicyUrl={privacyPolicyUrl}
        brandName={brandName}
        poweredBy={!!oemBrand}
      />
    </Screen>
  );
};
