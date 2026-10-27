import React, { useId } from 'react';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { buildAuthPayload, logout, sendAuthPayloadToParent } from '../../utils/authUtils';
import { useUIManager } from '../../context/UIManagerContext';
import { isEmbed } from '../../utils/isEmbed';
import { backToThirdParty } from '../../utils/messageHandler';
import { useEmailShare } from '../../hooks/useEmailShare';
import { useT } from '../../i18n';
import { EmailShareRow } from '../Shared/EmailShareRow';
import { ActionBar, Button, DoneHeader, Screen } from '../ui';

/** Plain sign-in, done: back to the app, or sign out. */
export const SuccessPage: React.FC = () => {
  const t = useT();
  const { user, jwt } = useAuthContext(); // Should be set on session init
  const { redirectUri, utm, clientId, devLicenseAlias, oemBrand } = useDevCredentials();
  const appName = oemBrand?.name || devLicenseAlias || t('common.app_developer_fallback');
  const { setUiState } = useUIManager();
  // A returning session skips the sign-in screen, so a user who never chose
  // (or whose choice was lost) is asked here before going back to the app.
  const emailShare = useEmailShare();
  const hintId = useId();

  const sendJwtAfterPermissions = () => {
    if (jwt && redirectUri && clientId) {
      const authPayload = buildAuthPayload(clientId, jwt, user);
      sendAuthPayloadToParent(authPayload, redirectUri, (payload) => {
        backToThirdParty(payload, redirectUri, utm);
      });
    }
  };

  const handleContinue = () => {
    if (emailShare.blocked) return;
    sendJwtAfterPermissions();
  };

  const handleLogout = () => {
    if (redirectUri && clientId) {
      logout(clientId, redirectUri, utm, setUiState);
    }
  };

  const embedded = isEmbed();
  const actions = (
    <ActionBar
      hint={
        emailShare.blocked && !embedded
          ? t('email.required_hint', { appName })
          : undefined
      }
      hintId={hintId}
      className="[&>div]:flex-col"
    >
      {!embedded && (
        <Button
          fullWidth
          onClick={handleContinue}
          disabled={emailShare.blocked}
          disabledReasonId={hintId}
        >
          {t('common.back_to_app', { appName })}
        </Button>
      )}
      <Button variant={embedded ? 'secondary' : 'ghost'} fullWidth onClick={handleLogout}>
        {t('common.log_out')}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <DoneHeader title={t('login_done.title')}>
        {user?.email ? t('login_done.body', { email: user.email }) : undefined}
      </DoneHeader>
      {emailShare.ask && (
        <EmailShareRow
          appName={appName}
          checked={emailShare.shared}
          onChange={emailShare.setShare}
          required={emailShare.required}
        />
      )}
    </Screen>
  );
};

export default SuccessPage;
