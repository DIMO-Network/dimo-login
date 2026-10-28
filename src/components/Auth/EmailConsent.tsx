import React from 'react';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { useEmailRequest } from '../../hooks/useEmailRequest';
import { useT } from '../../i18n';
import { sendLoginToApp } from '../../utils/authUtils';
import { sendErrorToParent } from '../../utils/errorUtils';
import { getRedirectHost } from '../../utils/urlHelpers';
import { AboutYouEmail } from '../Shared/EmailShareRow';
import { LegalNotice } from '../Shared/LegalNotice';
import { ActionBar, Button, Screen, ScreenHeader } from '../ui';
import { useAppName } from '../../hooks/useAppName';

/**
 * A plain login's one request: the user's email. Shown once per app and
 * account (see needsEmailConsent); the answer is remembered. A required email
 * can only be shared or the login cancelled, which the app hears as an error.
 */
export const EmailConsent: React.FC = () => {
  const t = useT();
  const { user, jwt } = useAuthContext();
  const { clientId, redirectUri, utm } = useDevCredentials();
  const appName = useAppName();
  const { setUiState } = useUIManager();
  const emailRequest = useEmailRequest();
  const { required } = emailRequest;

  const handleContinue = () => {
    emailRequest.commit();
    sendLoginToApp({ clientId, jwt, user, redirectUri, utm, setUiState });
  };

  const handleCancel = () => {
    sendErrorToParent('User declined to share their email', redirectUri, utm, setUiState);
  };

  const actions = (
    <ActionBar>
      {required && (
        <Button variant="secondary" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>
      )}
      <Button onClick={handleContinue}>
        {required ? t('consent.share_and_continue') : t('common.continue')}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <ScreenHeader
        title={t('consent.title', { appName })}
        subtitle={
          required
            ? t('consent.required', { appName })
            : t('consent.optional', { appName })
        }
        host={getRedirectHost(redirectUri)}
      />
      <AboutYouEmail appName={appName} request={emailRequest} />
      <LegalNotice />
    </Screen>
  );
};

export default EmailConsent;
