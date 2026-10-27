import React from 'react';
import { DevicePhoneMobileIcon, StopCircleIcon } from '@heroicons/react/24/outline';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { ShareResult } from '../../hooks/useShareVehicles';
import { translateText, useT } from '../../i18n';
import { formatDate } from '../../i18n/format';
import { SharingResult } from '../../models/vehicle';
import { buildAuthPayload } from '../../utils/authUtils';
import { shareEndOf } from '../../utils/dateUtils';
import { isEmbed } from '../../utils/isEmbed';
import { backToThirdParty } from '../../utils/messageHandler';
import { ActionBar, Button, DoneHeader, Notice, Screen, StatusChip } from '../ui';
import { useVehicleName, VehicleRow } from './VehicleRow';

type Translate = ReturnType<typeof useT>;

const endText = (t: Translate, expiration?: bigint) => {
  if (expiration === undefined) return '';
  const end = shareEndOf(expiration);
  return end.noEnd
    ? t('vehicle.shared_no_end')
    : t('vehicle.shared_until', { date: formatDate(end.date) });
};

const ResultStatus = ({ result }: { result: SharingResult }) => {
  const t = useT();
  if (result.outcome === 'revoked')
    return <StatusChip tone="off">{t('chip.stopped')}</StatusChip>;
  if (result.outcome === 'updated')
    return (
      <>
        <StatusChip tone="ok">{t('chip.updated')}</StatusChip>
        <span>{endText(t, result.expiration)}</span>
      </>
    );
  return <StatusChip tone="on">{endText(t, result.expiration)}</StatusChip>;
};

/** Title and line for what happened, in the user's words. */
const useSummary = (results: SharingResult[], appName: string) => {
  const t = useT();
  const name = useVehicleName();
  const [first] = results;
  if (!first) return { title: '', body: '' };

  if (first.outcome === 'revoked') {
    return {
      title: t('success.stopped_title'),
      body: t('success.stopped_body', { appName, vehicle: name(first.vehicle) }),
    };
  }
  if (first.outcome === 'extended') {
    const end = shareEndOf(first.expiration ?? BigInt(0));
    return {
      title: t('success.extended_title'),
      body: t('success.extended_body', {
        appName,
        vehicle: name(first.vehicle),
        date: formatDate(end.date),
      }),
    };
  }

  const count = results.length;
  if (results.every((r) => r.outcome === 'updated')) {
    return {
      title: t('success.updated_title', { count }),
      body: t('success.updated_body', { appName }),
    };
  }
  // One line about the end date only when every vehicle shares the same one.
  const ends = results.map((r) => shareEndOf(r.expiration ?? BigInt(0)));
  const sameEnd = ends.every(
    (end) =>
      end.noEnd === ends[0].noEnd &&
      (end.noEnd || end.date.getTime() === ends[0].date.getTime()),
  );
  let body = t('success.updated_body', { appName });
  if (sameEnd) {
    body = ends[0].noEnd
      ? t('success.shared_body_no_end', { appName, count })
      : t('success.shared_body', { appName, count, date: formatDate(ends[0].date) });
  }
  return { title: t('success.shared_title', { appName, count }), body };
};

// Vehicles whose update was skipped because their current grant couldn't be
// carried over. They're still shared exactly as before.
const SkippedUpdates = ({ skipped }: { skipped: ShareResult['skipped'] }) => {
  const t = useT();
  const count = skipped.length;
  return (
    <div className="flex flex-col gap-1.5">
      <Notice tone="warning" title={t('success.skipped_title', { count })}>
        {t('success.skipped_body', { count })}
      </Notice>
      {skipped.map(({ vehicle, reason }) => (
        <VehicleRow
          key={vehicle.tokenId}
          vehicle={vehicle}
          status={
            <>
              <StatusChip tone="pending">{t('chip.not_updated')}</StatusChip>
              <span>{translateText(reason, t)}</span>
            </>
          }
        />
      ))}
    </div>
  );
};

/**
 * Done: what was shared, updated, extended or stopped, with each vehicle's
 * new status. Popup apps were already told (useFinishVehicles); Back closes
 * the popup, or in redirect mode sends the result in the query.
 */
export const SuccessfulPermissions: React.FC = () => {
  const t = useT();
  const { redirectUri, utm, devLicenseAlias, clientId, oemBrand } = useDevCredentials();
  const appName = oemBrand?.name || devLicenseAlias;
  const { jwt, user } = useAuthContext();
  const {
    componentData: { action, results = [], skipped = [] },
  } = useUIManager();
  const { title, body } = useSummary(results, appName);
  const stopped = results[0]?.outcome === 'revoked';

  const handleBackToThirdParty = () => {
    const authPayload = buildAuthPayload(clientId, jwt, user);
    const tokenIds = results.map((r: SharingResult) => r.vehicle.tokenId).join(',');
    backToThirdParty(
      { ...authPayload, [`${action}Vehicles`]: tokenIds },
      redirectUri,
      utm,
    );
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
      <DoneHeader
        tone={stopped ? 'neutral' : 'positive'}
        icon={stopped ? <StopCircleIcon className="size-[26px]" /> : undefined}
        title={title}
      >
        {body}
      </DoneHeader>
      {results.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {results.map((result: SharingResult) => (
            <VehicleRow
              key={result.vehicle.tokenId}
              vehicle={result.vehicle}
              status={<ResultStatus result={result} />}
            />
          ))}
        </div>
      )}
      {skipped.length > 0 && <SkippedUpdates skipped={skipped} />}
      {!stopped && (
        <p className="flex items-start gap-2.5 rounded-control bg-card p-3 text-[13px] leading-[18px] text-fg">
          <DevicePhoneMobileIcon
            className="size-[18px] shrink-0 text-muted"
            aria-hidden="true"
          />
          <span>{t('done.next')}</span>
        </p>
      )}
    </Screen>
  );
};

export default SuccessfulPermissions;
