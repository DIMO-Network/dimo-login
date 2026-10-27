import React, { useEffect, useState } from 'react';
import { captureException } from '@sentry/react';
import { getPermissionsArray, Permission } from '@dimo-network/transactions';
import {
  ArrowPathIcon,
  InformationCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import {
  useFinishShareVehicles,
  useFinishVehicles,
  useUpdateVehiclePermissions,
} from '../../hooks';
import { translateText, useT, type Text } from '../../i18n';
import { formatDate, formatList } from '../../i18n/format';
import { SharingResult, Vehicle } from '../../models/vehicle';
import {
  checkDocumentAccess,
  GrantUnreadableError,
  readGrantAgreements,
  toCloudEventAgreements,
} from '../../services/vehicleDocumentAgreements';
import {
  CloudEventAgreement,
  VehicleManagerMandatoryParams,
  VehiclePermissionsAction,
} from '../../types';
import { isInvalidSessionError } from '../../utils/authUtils';
import { grantEndOf, shareEndOf } from '../../utils/dateUtils';
import { getAddedPermissions, needsPermissionUpdate } from '../../utils/permissions';
import { getNewExpirationDate } from '../../utils/vehicles';
import {
  ActionBar,
  Button,
  ErrorBox,
  Notice,
  Screen,
  ScreenHeader,
  StatusChip,
} from '../ui';
import { fileItems, permissionItem } from './access';
import { AccessRows } from './AccessRows';
import { StopSharingDialog } from './StopSharingDialog';
import { useVehicleName } from './VehicleRow';

const BUSY_LABEL_KEYS = {
  revoke: 'manage.busy.revoke',
  extend: 'manage.busy.extend',
  update: 'manage.busy.update',
} as const;

const grantedPermissions = (vehicle: Vehicle): Permission[] => {
  try {
    return getPermissionsArray(BigInt(vehicle.permissions || '0'));
  } catch {
    return [];
  }
};

/**
 * One shared vehicle: what the app can access and until when, then Update
 * (when the app asks for more), Extend 1 year (when the share has an end
 * date), or Stop sharing after a confirmation.
 */
export const ManageVehicle: React.FC = () => {
  const t = useT();
  const name = useVehicleName();
  const {
    componentData: { vehicle, permissionTemplateId, permissions },
    setBusy,
  } = useUIManager();
  const { expirationDate, cloudEvent, clientId, devLicenseAlias, oemBrand } =
    useDevCredentials<VehicleManagerMandatoryParams>();
  const appName = oemBrand?.name || devLicenseAlias;
  const { user } = useAuthContext();
  const updateVehiclePermissions = useUpdateVehiclePermissions();
  const finishShareVehicles = useFinishShareVehicles();
  const finishVehicles = useFinishVehicles();

  // The vehicle was captured when Manage was clicked, possibly before the
  // list's file check returned. Finish that check here so the right action
  // (Update vs Extend) is offered.
  const requestedFiles = toCloudEventAgreements(cloudEvent);
  const mustCheck =
    vehicle.shared && requestedFiles.length > 0 && vehicle.documentAccess === undefined;
  const [documentAccess, setDocumentAccess] = useState(vehicle.documentAccess);
  // Starts true when a check is due, so no frame offers Extend before it runs.
  const [checking, setChecking] = useState(mustCheck);
  useEffect(() => {
    if (!mustCheck) return;
    let cancelled = false;
    checkDocumentAccess(vehicle, requestedFiles, {
      grantor: user?.smartContractAddress,
      grantee: clientId,
    }).then((access) => {
      if (cancelled) return;
      setDocumentAccess(access);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The files the current grant already shares. Update and Extend carry them
  // over, so they're listed rather than re-signed unseen.
  const [keptFiles, setKeptFiles] = useState<CloudEventAgreement[]>([]);
  useEffect(() => {
    if (!vehicle.shared) return;
    let cancelled = false;
    readGrantAgreements(vehicle, {
      grantor: user?.smartContractAddress,
      grantee: clientId,
    })
      .then((agreements) => {
        if (!cancelled) setKeptFiles(agreements);
      })
      // Unreadable grants surface their error when an action is attempted.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [busyAction, setBusyAction] = useState<VehiclePermissionsAction | null>(null);
  const [error, setError] = useState<Text | null | undefined>(undefined);
  const [confirmStop, setConfirmStop] = useState(false);

  const currentVehicle: Vehicle = { ...vehicle, documentAccess };
  const needsUpdate = needsPermissionUpdate(
    currentVehicle,
    permissions,
    permissionTemplateId,
  );
  const added = needsUpdate
    ? getAddedPermissions([currentVehicle], permissions, permissionTemplateId)
    : [];
  const filesMissing = needsUpdate && documentAccess === false;
  const items = [
    ...grantedPermissions(currentVehicle).map((p) => permissionItem(p, t)),
    ...added.map((p) => permissionItem(p, t, true)),
    ...fileItems(keptFiles, t),
    ...(filesMissing
      ? fileItems(requestedFiles, t, true).filter(
          (item) => !fileItems(keptFiles, t).some((kept) => kept.id === item.id),
        )
      : []),
  ];
  const addedLabels = items.filter((item) => item.isNew).map((item) => item.label);

  const grantEnd = grantEndOf(vehicle.grantExpiresAt);
  const noEnd = !!grantEnd?.noEnd;
  const nextEnd = shareEndOf(
    getNewExpirationDate(vehicle, needsUpdate ? 'update' : 'extend', expirationDate),
  );

  const report = (action: VehiclePermissionsAction, expiration: bigint) => {
    // An update is a share with the requested permissions, reported the way
    // the vehicle list reports one.
    if (action === 'update') {
      finishShareVehicles([{ vehicle, outcome: 'updated', expiration }]);
      return;
    }
    const result: SharingResult =
      action === 'extend'
        ? { vehicle, outcome: 'extended', expiration }
        : { vehicle, outcome: 'revoked' };
    finishVehicles(action === 'extend' ? 'extended' : 'revoked', [result]);
  };

  const run = async (action: VehiclePermissionsAction) => {
    setError(undefined);
    setBusyAction(action);
    setBusy(true);
    const expiration = getNewExpirationDate(vehicle, action, expirationDate);
    try {
      await updateVehiclePermissions({
        permissionTemplateId,
        permissions,
        expiration,
        vehicle: currentVehicle,
        action,
      });
      report(action, expiration);
    } catch (err) {
      captureException(err);
      if (!isInvalidSessionError(err)) {
        setError(err instanceof GrantUnreadableError ? err.toMessage() : null);
      }
    } finally {
      setBusyAction(null);
      setBusy(false);
    }
  };

  const busy = busyAction !== null;
  const primary = needsUpdate ? 'update' : noEnd ? null : 'extend';

  const actions = (
    <ActionBar>
      <Button
        variant={primary ? 'destructive-ghost' : 'destructive'}
        onClick={() => setConfirmStop(true)}
        loading={busyAction === 'revoke'}
        loadingLabel={t(BUSY_LABEL_KEYS.revoke)}
        disabled={busy}
      >
        {t('manage.stop')}
      </Button>
      {primary && (
        <Button
          onClick={() => run(primary)}
          loading={busyAction === primary}
          loadingLabel={t(BUSY_LABEL_KEYS[primary])}
          // Wait for the file check, or Extend could be offered where Update is due.
          disabled={checking || busy}
        >
          {primary === 'update' ? t('manage.update') : t('manage.extend')}
        </Button>
      )}
    </ActionBar>
  );

  let note: React.ReactNode = null;
  if (needsUpdate) {
    note = nextEnd.noEnd
      ? t('manage.update_note_no_end')
      : t('manage.update_note', { date: formatDate(nextEnd.date) });
  } else if (noEnd) {
    note = t('manage.no_end_note');
  } else if (!checking) {
    note = t('manage.extend_note', { date: formatDate(nextEnd.date) });
  }
  const NoteIcon = needsUpdate || !noEnd ? ArrowPathIcon : InformationCircleIcon;

  return (
    <Screen actions={actions}>
      <ScreenHeader
        title={name(vehicle)}
        subtitle={t('vehicle.id', { id: vehicle.tokenId })}
      />

      <div className="flex flex-col gap-1.5 rounded-card bg-card px-4 py-3.5">
        <StatusChip tone={checking ? 'checking' : needsUpdate ? 'pending' : 'on'}>
          {checking
            ? t('vehicle.checking')
            : needsUpdate
              ? t('vehicle.needs_update')
              : t('manage.status', { appName })}
        </StatusChip>
        {grantEnd && (
          <span className="text-body-sm text-fg">
            {noEnd
              ? t('manage.no_end')
              : t('manage.until', { date: formatDate(grantEnd.date) })}
          </span>
        )}
      </div>

      {needsUpdate && (
        <Notice
          title={t('manage.update_title', { appName })}
          icon={<SparklesIcon className="size-[18px]" />}
        >
          {t('manage.update_body', { list: formatList(addedLabels) })}
        </Notice>
      )}

      {error !== undefined && (
        <ErrorBox title={t('manage.error.title')}>
          {error ? translateText(error, t) : t('manage.error.body')}
        </ErrorBox>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-card-title text-ink">
          {t('manage.access_heading', { appName })}
        </h2>
        <AccessRows items={items} tileClassName="bg-card" />
      </section>

      {note && (
        <p className="flex items-center gap-2 text-body-sm text-muted">
          <NoteIcon className="size-[18px] shrink-0" aria-hidden="true" />
          <span>{note}</span>
        </p>
      )}

      <StopSharingDialog
        open={confirmStop}
        appName={appName}
        vehicleName={name(vehicle)}
        onCancel={() => setConfirmStop(false)}
        onConfirm={() => {
          setConfirmStop(false);
          run('revoke');
        }}
      />
    </Screen>
  );
};

export default ManageVehicle;
