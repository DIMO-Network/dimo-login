import React, { type FC, useEffect } from 'react';
import { EyeSlashIcon } from '@heroicons/react/24/outline';

import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import { UiStates } from '../../enums';
import { useSignUp } from '../../hooks/useSignUp';
import { useT } from '../../i18n';
import { isAppleRelayEmail } from '../../utils/emailUtils';
import { ActionBar, Button, DoneHeader, Notice, Screen } from '../ui';

/**
 * A brand-new account from Sign in with Apple's Hide My Email address: it
 * would be separate from any account under the person's own email, so they
 * choose before the passkey step. Without that sign-up in progress it goes to
 * the email screen (an app can't name this state as its entryState).
 */
export const RelayEmailNotice: FC = () => {
  const t = useT();
  const { signUpDraft, openEmailForm } = useAuthContext();
  const { confirmRelay } = useSignUp();
  const { setUiState } = useUIManager();
  const relayDraft =
    signUpDraft?.kind === 'proof' && isAppleRelayEmail(signUpDraft.email)
      ? signUpDraft
      : null;

  useEffect(() => {
    if (!relayDraft) setUiState(UiStates.EMAIL_INPUT);
  }, [relayDraft, setUiState]);

  if (!relayDraft) return null;

  const actions = (
    <ActionBar className="[&>div]:flex-col">
      <Button fullWidth onClick={confirmRelay}>
        {t('signup.relay.create')}
      </Button>
      <Button variant="secondary" fullWidth onClick={openEmailForm}>
        {t('signup.relay.use_email')}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <DoneHeader
        tone="ink"
        icon={<EyeSlashIcon className="size-[26px]" />}
        title={t('signup.relay.title')}
      >
        <span className="wrap-anywhere">
          {t('signup.relay.body', { email: relayDraft.email })}
        </span>
      </DoneHeader>
      <Notice>{t('signup.relay.hint')}</Notice>
    </Screen>
  );
};
