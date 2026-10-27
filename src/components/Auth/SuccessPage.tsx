import React from 'react';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { buildAuthPayload, logout, sendAuthPayloadToParent } from '../../utils/authUtils';
import { useUIManager } from '../../context/UIManagerContext';
import { isEmbed } from '../../utils/isEmbed';
import { backToThirdParty } from '../../utils/messageHandler';
import { useEmailRequest } from '../../hooks/useEmailRequest';
import { useT } from '../../i18n';
import { AboutYouEmail } from '../Shared/EmailShareRow';
import { ActionBar, Button, DoneHeader, Screen } from '../ui';
import { useAppName } from '../../hooks/useAppName';

/** Plain sign-in, done: back to the app, or sign out. */
export const SuccessPage: React.FC = () => {
  const t = useT();
  const { user, jwt } = useAuthContext(); // Should be set on session init
  const { redirectUri, utm, clientId } = useDevCredentials();
  const appName = useAppName();
  const { setUiState } = useUIManager();
  // A returning session lands here instead of the consent step, so the
  // email item (when the app asks for it) is part of going back.
  const emailRequest = useEmailRequest();

  const sendJwtAfterPermissions = () => {
    if (jwt && redirectUri && clientId) {
      const authPayload = buildAuthPayload(clientId, jwt, user);
      sendAuthPayloadToParent(authPayload, redirectUri, (payload) => {
        backToThirdParty(payload, redirectUri, utm);
      });
    }
  };

  const handleContinue = () => {
    emailRequest.commit();
    sendJwtAfterPermissions();
  };

  const handleLogout = () => {
    if (redirectUri && clientId) {
      logout(clientId, redirectUri, utm, setUiState);
    }
  };

  const embedded = isEmbed();
  const actions = (
    <ActionBar className="[&>div]:flex-col">
      {!embedded && (
        <Button fullWidth onClick={handleContinue}>
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
      {/* Embedded, the app already has the login and there's no Back to send
          a new answer with, so the switch would change nothing. */}
      {!embedded && <AboutYouEmail appName={appName} request={emailRequest} />}
    </Screen>
  );
};

export default SuccessPage;
