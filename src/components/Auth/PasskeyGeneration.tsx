import React, { type FC, useState } from 'react';
import { captureException } from '@sentry/react';
import { CheckIcon, KeyIcon } from '@heroicons/react/24/outline';

import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import { ErrorMessage } from '../Shared/ErrorMessage';
import { LegalNotice } from '../Shared/LegalNotice';
import { useSignUp } from '../../hooks/useSignUp';
import { message, useT } from '../../i18n';
import { ActionBar, Button, DoneHeader, Screen } from '../ui';

const BENEFITS = [
  'create.benefit_biometric',
  'create.benefit_nothing_to_remember',
  'create.benefit_phishing',
] as const;

/**
 * A new account: create its passkey, which is how it signs in from now on.
 * The email was proved on the way here (a code, or a Google/Apple token), and
 * finishing sign-up is useSignUp's job: this screen only asks for it.
 */
export const PasskeyGeneration: FC = () => {
  const t = useT();
  const { signUpDraft } = useAuthContext();
  const { finish } = useSignUp();
  const { setError, error, setBusy } = useUIManager();
  // Kept on this screen rather than the shared loader, which would unmount it
  // mid-creation.
  const [creating, setCreating] = useState(false);

  if (!signUpDraft) return null;
  const { email } = signUpDraft;

  const handlePasskeyGeneration = async () => {
    try {
      setError(null);
      setCreating(true);
      setBusy(true);
      // Sign-up moves on by itself: to sign-in, or back to the code screen
      // with an error when the code was rejected.
      await finish();
    } catch (err) {
      captureException(err);
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
      <LegalNotice />
    </Screen>
  );
};
