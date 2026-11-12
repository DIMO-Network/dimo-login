import React, { useState } from 'react';
import { captureException } from '@sentry/react';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { useAppName } from '../../hooks/useAppName';
import { useConnectedApps, type AppAccess } from '../../hooks/useConnectedApps';
import { message, useT } from '../../i18n';
import { formatDate } from '../../i18n/format';
import { revokeAppAccess } from '../../services/connectedAppsRevoke';
import { grantEndOf } from '../../utils/dateUtils';
import { isEmbed } from '../../utils/isEmbed';
import { backToThirdParty } from '../../utils/messageHandler';
import { ErrorContent } from '../Shared/ErrorScreen';
import { Loader } from '../Shared/Loader';
import { ActionBar, Button, ErrorBox, Screen, ScreenHeader } from '../ui';
import { AppRow } from './AppRow';
import { RevokeDialog } from './RevokeDialog';

/** "0x1234…abcd": enough to tell addresses apart. */
const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-1.5" aria-label={label}>
    <h2 className="px-0.5 text-label text-muted">{label}</h2>
    {children}
  </section>
);

/**
 * The account's connected apps: those that can access its data (on-chain
 * grants, which it can end by signing) and the other apps signed in as it on
 * this browser (which it can sign out here). The app that opened the page is
 * told nothing: no token, no list; Back returns with only the redirect.
 */
const ConnectedAppsPage = () => {
  const t = useT();
  const appName = useAppName();
  const { redirectUri } = useDevCredentials();
  const { user, validateSession } = useAuthContext();
  const { setBusy } = useUIManager();
  const { grants, browserApps, nameOf, reload, signOutHere } = useConnectedApps();
  const [confirming, setConfirming] = useState<AppAccess | null>(null);
  const [stopping, setStopping] = useState<string | null>(null);
  const [failedName, setFailedName] = useState<string | null>(null);

  const displayName = (address: string) =>
    nameOf(address) ?? t('apps.unknown_app', { address: shortAddress(address) });

  const detailsOf = (app: AppAccess) => {
    const end = grantEndOf(app.expiresAt);
    const until = end?.noEnd
      ? t('share_end.no_end')
      : end && t('apps.until', { date: formatDate(end.date) });
    return [
      app.vehicles.length > 0 && t('apps.vehicles', { count: app.vehicles.length }),
      app.documents && t('apps.documents'),
      until,
    ].filter((detail): detail is string => Boolean(detail));
  };

  // Needs the confirmation, then the account's signature (validateSession
  // sends the person to sign in when there's no wallet session). Afterwards
  // the list is read again, so it shows what is on chain, not what was hoped.
  const stop = async (app: AppAccess) => {
    setConfirming(null);
    setFailedName(null);
    setStopping(app.grantee);
    setBusy(true);
    try {
      if (!(await validateSession())) return;
      const owner = user.smartContractAddress;
      if (!owner) throw new Error('The account has no wallet address');
      await revokeAppAccess(owner, app);
    } catch (error) {
      captureException(error);
      setFailedName(displayName(app.grantee));
    } finally {
      setStopping(null);
      setBusy(false);
    }
    reload();
  };

  const actions = (
    <ActionBar>
      <Button
        fullWidth
        disabled={stopping !== null}
        onClick={() => backToThirdParty({}, redirectUri, '')}
      >
        {t('common.back_to_app', { appName })}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <ScreenHeader title={t('apps.title')} subtitle={t('apps.subtitle')} />
      {failedName && <ErrorBox title={t('apps.error.stop', { appName: failedName })} />}

      <Section label={t('apps.section_data')}>
        {grants === 'loading' && <Loader />}
        {grants === 'error' && (
          <div className="flex flex-col gap-2">
            <ErrorBox title={t('apps.error.load')} />
            <Button variant="secondary" fullWidth onClick={() => reload()}>
              {t('common.try_again')}
            </Button>
          </div>
        )}
        {Array.isArray(grants) && grants.length === 0 && (
          <p className="px-0.5 text-body-sm text-muted">{t('apps.empty')}</p>
        )}
        {Array.isArray(grants) && grants.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {grants.map((app) => (
              <AppRow
                key={app.grantee}
                name={displayName(app.grantee)}
                details={detailsOf(app)}
                action={
                  <Button
                    variant="destructive-ghost"
                    size="sm"
                    className="shrink-0"
                    disabled={stopping !== null}
                    loading={stopping === app.grantee}
                    loadingLabel={t('manage.busy.revoke')}
                    onClick={() => setConfirming(app)}
                  >
                    {t('apps.stop')}
                  </Button>
                }
              />
            ))}
          </ul>
        )}
      </Section>

      {browserApps.length > 0 && (
        <Section label={t('apps.section_browser')}>
          <ul className="flex flex-col gap-1.5">
            {browserApps.map((app) => (
              <AppRow
                key={app}
                name={displayName(app)}
                note={t('apps.sign_out_note', { appName: displayName(app) })}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={stopping !== null}
                    onClick={() => signOutHere(app)}
                  >
                    {t('apps.sign_out_here')}
                  </Button>
                }
              />
            ))}
          </ul>
        </Section>
      )}

      <RevokeDialog
        appName={confirming && displayName(confirming.grantee)}
        onConfirm={() => confirming && stop(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </Screen>
  );
};

/**
 * entryState=CONNECTED_APPS (behind REACT_APP_CONNECTED_APPS). Embedded it is
 * refused (also before sign-in, see connectedAppsValidations): the browser
 * keeps a separate store per embedding site, and this page revokes access.
 */
export const ConnectedApps = () =>
  isEmbed() ? (
    <ErrorContent title={message('apps.title')} message={message('apps.embedded')} />
  ) : (
    <ConnectedAppsPage />
  );
