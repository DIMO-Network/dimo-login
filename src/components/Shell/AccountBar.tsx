import React from 'react';

import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import { UiStates } from '../../enums';
import { useT } from '../../i18n';
import { Button } from '../ui';

/** The request screens, where an app is waiting on the account that's signed in. */
export const ACCOUNT_BAR_STATES: ReadonlySet<UiStates> = new Set([
  UiStates.SUCCESS,
  UiStates.EMAIL_CONSENT,
  UiStates.VEHICLE_MANAGER,
  UiStates.MANAGE_VEHICLE,
  UiStates.ACCOUNT_MANAGER,
  UiStates.SIGN_MESSAGE,
  UiStates.ADVANCED_TRANSACTION,
  UiStates.PROVISION_DEVELOPER_LICENSE,
  UiStates.CONNECTED_APPS,
]);

/**
 * Names the account acting on the request and lets the user change it. The
 * switch signs this app out inside the login and reopens the chooser; the app
 * isn't told. Hidden while something is being signed, which can't be abandoned.
 */
export const AccountBar: React.FC = () => {
  const t = useT();
  const { jwt, user, switchAccount } = useAuthContext();
  const { uiState, busy } = useUIManager();

  if (!jwt || !user?.email || !ACCOUNT_BAR_STATES.has(uiState)) return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 px-5 pb-2">
      <span className="min-w-0 truncate text-label text-muted">
        {t('account.signed_in_as', { email: user.email })}
      </span>
      {!busy && (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={switchAccount}>
          {t('signin.other_account')}
        </Button>
      )}
    </div>
  );
};

export default AccountBar;
