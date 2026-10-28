import React from 'react';
import { FingerPrintIcon } from '@heroicons/react/24/outline';

import { LegalNotice } from '../Shared/LegalNotice';
import ErrorMessage from '../Shared/ErrorMessage';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { clearLoggedEmail } from '../../services';
import { useAuthContext } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { ActionBar, Button, DoneHeader, Notice, Screen } from '../ui';

/**
 * The passkey prompt was closed or timed out: try it again, get an email
 * code instead, or sign in with another account.
 */
export const PasskeyLoginFail = ({ email }: { email: string }) => {
  const t = useT();
  const { clientId } = useDevCredentials();
  const { setUiState, setError, error } = useUIManager();
  const { resetUser, user } = useAuthContext();

  const go = (state: UiStates) => {
    setError(null);
    setUiState(state);
  };

  const actions = (
    <ActionBar className="[&>div]:flex-col">
      <Button fullWidth onClick={() => go(UiStates.PASSKEY_LOGIN)}>
        {t('passkey.cta')}
      </Button>
      <Button variant="secondary" fullWidth onClick={() => go(UiStates.OTP_INPUT)}>
        {t('passkey.email_code')}
      </Button>
      <Button
        variant="ghost"
        fullWidth
        onClick={() => {
          resetUser();
          clearLoggedEmail(clientId);
          go(UiStates.EMAIL_INPUT);
        }}
      >
        {t('signin.other_account')}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <DoneHeader
        tone="ink"
        icon={<FingerPrintIcon className="size-[26px]" />}
        title={t('passkey.title')}
      >
        {t('passkey.body', { email: email || user?.email || '' })}
      </DoneHeader>
      {error ? (
        <ErrorMessage message={error} />
      ) : (
        <Notice tone="warning" role="status">
          {t('passkey.cancelled')}
        </Notice>
      )}
      <LegalNotice />
    </Screen>
  );
};
