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
} from '../../hooks/useFinishShareVehicles';
import { useUpdateVehiclePermissions } from '../../hooks/useUpdateVehiclePermissions';
import { useEmailRequest } from '../../hooks/useEmailRequest';
import { translateText, useT, type Text, type TranslationKey } from '../../i18n';
import { formatDate, formatList } from '../../i18n/format';
import { SharingResult, Vehicle } from '../../models/vehicle';
import {
  checkDocumentAccess,
  covers,
  coversAll,
  GrantUnreadableError,
  kindsAmong,
  readGrantAgreements,
  toCloudEventAgreements,
  withoutKinds,
  withSource,
} from '../../services/vehicleDocumentAgreements';
import {
  CloudEventAgreement,
  VehicleManagerMandatoryParams,
  VehiclePermissionsAction,
} from '../../types';
import { isInvalidSessionError } from '../../utils/authUtils';
import { grantEndOf, shareEndOf } from '../../utils/dateUtils';
import { clearDeclined, loadDeclined, requestKey } from '../../utils/declinedPermissions';
import {
  getAddedPermissions,
  getRemovedPermissions,
  narrowRequest,
  needsPermissionUpdate,
} from '../../utils/permissions';
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
import { emailItem, fileItems, permissionItem } from './access';
import { AccessRows } from './AccessRows';
import { StopSharingDialog } from './StopSharingDialog';
import { useVehicleName } from './VehicleRow';
import { useAppName } from '../../hooks/useAppName';

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
 * (when the app asks for more, or the user switched off something the share
 * has on the request card), Extend 1 year (when the share has an end date),
 * or Stop sharing after a confirmation.
 */
export const ManageVehicle: React.FC = () => {
  const t = useT();
  const name = useVehicleName();
  const {
    componentData: { vehicle, permissionTemplateId, permissions },
    setBusy,
  } = useUIManager();
  const { expirationDate, cloudEvent, clientId } =
    useDevCredentials<VehicleManagerMandatoryParams>();
  const appName = useAppName();
  const { user } = useAuthContext();
  const updateVehiclePermissions = useUpdateVehiclePermissions();
  const finishShareVehicles = useFinishShareVehicles();
  const finishVehicles = useFinishVehicles();
  const emailRequest = useEmailRequest();

  // The vehicle was captured when Manage was clicked, possibly before the
  // list's file check returned. Finish that check here so the right action
  // (Update vs Extend) is offered.
  const requestedFiles = toCloudEventAgreements(cloudEvent);
  const mustCheck =
    vehicle.shared && requestedFiles.length > 0 && vehicle.documentAccess === undefined;
  const [documentAccess, setDocumentAccess] = useState(vehicle.documentAccess);
  // Starts true when a check is due, so no frame offers Extend before it runs.
  const [checkingAccess, setChecking] = useState(mustCheck);
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
  // undefined while reading; false when the grant couldn't be read.
  const [grantRead, setGrantRead] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    if (!vehicle.shared) return;
    let cancelled = false;
    readGrantAgreements(vehicle, {
      grantor: user?.smartContractAddress,
      grantee: clientId,
    })
      .then((agreements) => {
        if (cancelled) return;
        setKeptFiles(agreements);
        setGrantRead(true);
      })
      // Unreadable grants surface their error when an action is attempted.
      .catch(() => {
        if (!cancelled) setGrantRead(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [busyAction, setBusyAction] = useState<VehiclePermissionsAction | null>(null);
  const [error, setError] = useState<Text | null | undefined>(undefined);
  const [confirmStop, setConfirmStop] = useState(false);

  // What was switched off on the request card: left out, and removed from
  // this share if it has it.
  const declined = loadDeclined(requestKey(clientId, permissions, permissionTemplateId));
  const request = narrowRequest(permissions, permissionTemplateId, declined.permissions);
  const wantedFiles = withoutKinds(requestedFiles, declined.files);
  // With documents switched off, file access is judged by those left on, from
  // the grant read above; until it's read, the screen says it's checking.
  const judgingFiles = declined.files.length > 0 && vehicle.shared;
  let fileAccess = documentAccess;
  if (judgingFiles) {
    fileAccess =
      wantedFiles.length && grantRead
        ? coversAll(keptFiles, withSource(wantedFiles, user?.smartContractAddress))
        : undefined;
  }
  const checking = checkingAccess || (judgingFiles && grantRead === undefined);
  const removedFiles = grantRead ? kindsAmong(keptFiles, declined.files) : [];
  const currentVehicle: Vehicle = { ...vehicle, documentAccess: fileAccess };
  const wantsUpdate =
    needsPermissionUpdate(
      currentVehicle,
      request.permissions,
      request.permissionTemplateId,
      declined.permissions,
    ) || removedFiles.length > 0;
  const added = wantsUpdate
    ? getAddedPermissions(
        [currentVehicle],
        request.permissions,
        request.permissionTemplateId,
      )
    : [];
  const removed = getRemovedPermissions(currentVehicle, declined.permissions);
  // With every permission switched off, an update would leave the share with
  // none at all. That's Stop sharing, so Update isn't offered.
  const leavesNoPermissions =
    declined.permissions.length > 0 &&
    !added.length &&
    !grantedPermissions(currentVehicle).some((p) => !removed.includes(p));
  const needsUpdate = wantsUpdate && !leavesNoPermissions;
  const grantEnd = grantEndOf(vehicle.grantExpiresAt);
  const noEnd = !!grantEnd?.noEnd;
  // Extend needs a known end date to count from; "no end" has nothing to extend.
  const primary = needsUpdate ? 'update' : grantEnd && !noEnd ? 'extend' : null;
  // Update and Extend re-sign the app's request, so a required email this
  // account hasn't shared yet is listed and approved with them.
  const emailNew =
    primary !== null &&
    emailRequest.asked &&
    emailRequest.required &&
    !emailRequest.granted;

  const filesMissing = needsUpdate && fileAccess === false;
  // Requested files the grant doesn't cover yet, judged as Update merges them
  // (all of a document type is wider than some ids of it). One that widens a
  // kept file is listed as New in its place.
  const newFileItems = filesMissing
    ? fileItems(
        wantedFiles.filter((wanted) => !keptFiles.some((kept) => covers(kept, wanted))),
        t,
        true,
      )
    : [];
  // What the app can access once updated: what was switched off is gone. With
  // no Update offered, nothing is taken off, so the grant is listed as it is.
  const takenOff = needsUpdate ? removed : [];
  const filesTakenOff = needsUpdate ? declined.files : [];
  const items = [
    ...grantedPermissions(currentVehicle)
      .filter((p) => !takenOff.includes(p))
      .map((p) => permissionItem(p, t)),
    ...added.map((p) => permissionItem(p, t, true)),
    ...fileItems(withoutKinds(keptFiles, filesTakenOff), t).filter(
      (kept) => !newFileItems.some((item) => item.id === kept.id),
    ),
    ...newFileItems,
    ...(emailNew && emailRequest.email
      ? [{ ...emailItem(emailRequest.email, t), isNew: true }]
      : []),
  ];
  const addedLabels = items.filter((item) => item.isNew).map((item) => item.label);
  const removedLabels = [
    ...removed.map((p) => permissionItem(p, t).label),
    ...removedFiles.map((kind) => t(kind as TranslationKey)),
  ];

  const nextEnd = primary
    ? shareEndOf(getNewExpirationDate(vehicle, primary, expirationDate))
    : null;

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
      // The request less what was switched off. Only Update takes switched-off
      // permissions off the share; Extend keeps it exactly as it is. Stop
      // sharing is signed with the app's request, as it always was.
      const signed =
        action === 'revoke' ? { permissions, permissionTemplateId } : request;
      await updateVehiclePermissions({
        permissionTemplateId: signed.permissionTemplateId,
        permissions: signed.permissions,
        expiration,
        vehicle: currentVehicle,
        action,
        declined: action === 'update' ? declined.permissions : [],
        declinedFiles: action === 'update' ? declined.files : [],
      });
      clearDeclined();
      if (emailNew && action !== 'revoke') emailRequest.commit();
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
  if (needsUpdate && nextEnd) {
    note = nextEnd.noEnd
      ? t('manage.update_note_no_end')
      : t('manage.update_note', { date: formatDate(nextEnd.date) });
  } else if (noEnd) {
    note = t('manage.no_end_note');
  } else if (nextEnd && !checking) {
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
          title={
            addedLabels.length || !removedLabels.length
              ? t('manage.update_title', { appName })
              : t('manage.remove_title')
          }
          icon={<SparklesIcon className="size-[18px]" />}
        >
          {removedLabels.length
            ? addedLabels.length
              ? t('manage.update_remove_body', {
                  added: formatList(addedLabels),
                  removed: formatList(removedLabels),
                })
              : t('manage.remove_body', { list: formatList(removedLabels) })
            : t('manage.update_body', { list: formatList(addedLabels) })}
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
