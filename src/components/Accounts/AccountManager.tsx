import React, { useId, useState } from 'react';
import { captureException } from '@sentry/react';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { useEmailRequest } from '../../hooks/useEmailRequest';
import { useShareAccounts } from '../../hooks/useShareAccounts';
import { useFinishShareAccounts } from '../../hooks/useFinishShareAccounts';
import { useT } from '../../i18n';
import { DOCUMENT_EVENT_TYPES } from '../../enums/documentEventTypes';
import { AccountManagerMandatoryParams, CloudEventAgreement } from '../../types';
import { isInvalidSessionError } from '../../utils/authUtils';
import { getDefaultExpirationDate, shareEndOf } from '../../utils/dateUtils';
import { sendErrorToParent } from '../../utils/errorUtils';
import { getRedirectHost } from '../../utils/urlHelpers';
import { EmailShareRow } from '../Shared/EmailShareRow';
import { LegalNotice } from '../Shared/LegalNotice';
import { ActionBar, Button, ErrorBox, Screen, ScreenHeader } from '../ui';
import { fileItems } from '../Vehicles/access';
import { AccessRows } from '../Vehicles/AccessRows';
import { useShareEndLabel } from '../Vehicles/AccessSummary';

// What the account SACD grants (see accountDocumentAgreements.ts), named from
// the same event types so the screen matches what is signed.
const DRIVER_DOCUMENTS: CloudEventAgreement[] = [
  { eventType: DOCUMENT_EVENT_TYPES.driverDocuments, ids: [], tags: [] },
  { eventType: DOCUMENT_EVENT_TYPES.rawDriverDocuments, ids: [], tags: [] },
];

/**
 * Account-level consent, the no-vehicle-list sibling of VehicleManager: the
 * documents the app can see, for how long, and Allow / Cancel. Cancel reports
 * a rejection to the app and shows the cancelled screen; it never reports
 * success.
 */
export const AccountManager: React.FC = () => {
  const t = useT();
  const {
    devLicenseAlias,
    oemBrand,
    redirectUri,
    utm,
    expirationDate,
    tosUrl,
    privacyPolicyUrl,
  } = useDevCredentials<AccountManagerMandatoryParams>();
  const appName = oemBrand?.name || devLicenseAlias || t('common.app_developer_fallback');
  const { setUiState, setBusy } = useUIManager();
  const shareAccounts = useShareAccounts();
  const finishShareAccounts = useFinishShareAccounts();
  const emailRequest = useEmailRequest();
  const endLabel = useShareEndLabel();
  const hintId = useId();
  const [sharing, setSharing] = useState(false);
  // undefined: no error. A string is the underlying error, shown as detail.
  const [error, setError] = useState<string | undefined>(undefined);

  const end = shareEndOf(expirationDate ?? getDefaultExpirationDate());

  const handleShare = async () => {
    setError(undefined);
    setSharing(true);
    setBusy(true);
    try {
      await shareAccounts();
      // Approving the request approves its email item too.
      emailRequest.commit();
      finishShareAccounts();
    } catch (err) {
      // Log the real error to the console — captureException ships it to Sentry,
      // but that request is often blocked (content blockers/CORS), leaving only
      // the opaque failure. This makes the cause legible.
      // eslint-disable-next-line no-console
      console.error('Account document sharing failed:', err);
      captureException(err);
      if (!isInvalidSessionError(err)) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSharing(false);
      setBusy(false);
    }
  };

  const onCancel = () => {
    // Cancel must NOT report success — notify the developer of the rejection and
    // navigate to the cancelled screen (mirrors sendErrorToParent on other flows).
    sendErrorToParent('User cancelled document sharing', redirectUri, utm, setUiState);
  };

  const hint = sharing ? t('share.keep_open') : undefined;

  const actions = (
    <ActionBar hint={hint} hintId={hintId}>
      <Button variant="secondary" onClick={onCancel} disabled={sharing}>
        {t('common.cancel')}
      </Button>
      <Button onClick={handleShare} loading={sharing} loadingLabel={t('share.sharing')}>
        {error !== undefined ? t('common.try_again') : t('docs.allow')}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <ScreenHeader
        title={t('docs.title', { appName })}
        host={getRedirectHost(redirectUri)}
      />
      {error !== undefined && (
        <ErrorBox title={t('docs.error.title')}>
          <span>{t('docs.error.body')}</span>
          {error && (
            <span className="text-label font-normal text-muted">
              {t('common.error_detail', { detail: error })}
            </span>
          )}
        </ErrorBox>
      )}
      <section
        className="flex flex-col gap-3 rounded-card bg-card px-4 py-3.5"
        aria-labelledby={`${hintId}-access`}
      >
        <h2 id={`${hintId}-access`} className="text-card-title text-ink">
          {t('request.about_you')}
        </h2>
        <AccessRows items={fileItems(DRIVER_DOCUMENTS, t)} />
        {emailRequest.asked && emailRequest.email && (
          <EmailShareRow
            compact
            appName={appName}
            email={emailRequest.email}
            required={emailRequest.required}
            checked={emailRequest.shared}
            onChange={emailRequest.setShared}
          />
        )}
        <p className="text-body-sm text-fg">
          {endLabel(end)}
          <span className="text-muted" aria-hidden="true">
            {' · '}
          </span>
          {t('share.stop_anytime')}
        </p>
      </section>
      <LegalNotice
        tosUrl={tosUrl}
        privacyPolicyUrl={privacyPolicyUrl}
        brandName={appName}
        poweredBy={!!oemBrand}
      />
    </Screen>
  );
};

export default AccountManager;
