import React from 'react';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useAuthContext } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { formatDate } from '../../i18n/format';
import { AccountManagerMandatoryParams } from '../../types';
import { buildAuthPayload } from '../../utils/authUtils';
import { getDefaultExpirationDate, shareEndOf } from '../../utils/dateUtils';
import { isEmbed } from '../../utils/isEmbed';
import { backToThirdParty } from '../../utils/messageHandler';
import { ActionBar, Button, DoneHeader, Screen } from '../ui';
import { useAppName } from '../../hooks/useAppName';

// Account-grant success screen. Mirrors SuccessfulPermissions but with
// document-oriented copy and no vehicle list (componentData carries no vehicles
// on the account lane, so reusing the vehicle screen would be wrong/unsafe).
export const AccountPermissionsSuccess: React.FC = () => {
  const t = useT();
  const { redirectUri, utm, clientId, expirationDate } =
    useDevCredentials<AccountManagerMandatoryParams>();
  const appName = useAppName();
  const { jwt, user } = useAuthContext();
  const end = shareEndOf(expirationDate ?? getDefaultExpirationDate());

  const handleBackToThirdParty = () => {
    const authPayload = buildAuthPayload(clientId, jwt, user);
    backToThirdParty({ ...authPayload, accountGranted: true }, redirectUri, utm);
  };

  const actions = isEmbed() ? undefined : (
    <ActionBar>
      <Button onClick={handleBackToThirdParty}>
        {t('common.back_to_app', { appName })}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <DoneHeader title={t('success.docs_title', { appName })}>
        {end.noEnd
          ? t('success.docs_body_no_end', { appName })
          : t('success.docs_body', { appName, date: formatDate(end.date) })}
      </DoneHeader>
    </Screen>
  );
};

export default AccountPermissionsSuccess;
