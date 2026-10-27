import React from 'react';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { useEmailRequest } from '../../hooks/useEmailRequest';
import { useT } from '../../i18n';
import { sendLoginToApp } from '../../utils/authUtils';
import { sendErrorToParent } from '../../utils/errorUtils';
import { getRedirectHost } from '../../utils/urlHelpers';
import { EmailShareRow } from '../Shared/EmailShareRow';
import { LegalNotice } from '../Shared/LegalNotice';
import { ActionBar, Button, Screen, ScreenHeader } from '../ui';

/**
 * A plain login's one request: the user's email. Shown once per app and
 * account (see needsEmailConsent); the answer is remembered. A required email
 * can only be shared or the login cancelled, which the app hears as an error.
 */
export const EmailConsent: React.FC = () => {
  const t = useT();
  const { user, jwt } = useAuthContext();
  const {
    clientId,
    redirectUri,
    utm,
    devLicenseAlias,
    oemBrand,
    tosUrl,
    privacyPolicyUrl,
  } = useDevCredentials();
  const appName = oemBrand?.name || devLicenseAlias || t('common.app_developer_fallback');
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
      {emailRequest.email && (
        <section className="flex flex-col gap-2">
          <h2 className="px-0.5 text-label text-muted">{t('request.about_you')}</h2>
          <EmailShareRow
            appName={appName}
            email={emailRequest.email}
            required={required}
            checked={emailRequest.shared}
            onChange={emailRequest.setShared}
          />
        </section>
      )}
      <LegalNotice
        tosUrl={tosUrl}
        privacyPolicyUrl={privacyPolicyUrl}
        brandName={appName}
        poweredBy={!!oemBrand}
      />
    </Screen>
  );
};

export default EmailConsent;
