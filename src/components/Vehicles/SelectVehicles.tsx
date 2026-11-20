import React, { useEffect, useId, useMemo, useState } from 'react';
import { captureException } from '@sentry/react';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useOracles } from '../../context/OraclesContext';
import { useUIManager } from '../../context/UIManagerContext';
import { UiStates } from '../../enums';
import { useFetchVehicles } from '../../hooks/useFetchVehicles';
import { useFinishShareVehicles } from '../../hooks/useFinishShareVehicles';
import { useShareVehicles } from '../../hooks/useShareVehicles';
import { useEmailRequest } from '../../hooks/useEmailRequest';
import useSelectVehicles from '../../hooks/useSelectVehicles';
import {
  translateText,
  useT,
  type Language,
  type Text,
  type TranslationKey,
} from '../../i18n';
import { formatList } from '../../i18n/format';
import { SharingResult, Vehicle } from '../../models/vehicle';
import {
  createPermissionsFromParams,
  getTemplateDescription,
} from '../../services/permissionsService';
import {
  coversAll,
  getMissingFileLabels,
  GrantUnreadableError,
  kindsAmong,
  toCloudEventAgreements,
  withoutKinds,
  withSource,
} from '../../services/vehicleDocumentAgreements';
import { VehicleManagerMandatoryParams } from '../../types';
import { isInvalidSessionError } from '../../utils/authUtils';
import { sendErrorToParent } from '../../utils/errorUtils';
import { shareEndOf } from '../../utils/dateUtils';
import {
  clearDeclined,
  type Declined,
  loadDeclined,
  requestKey,
  saveDeclined,
} from '../../utils/declinedPermissions';
import {
  getAddedPermissions,
  getPermissionLabel,
  getRemovedPermissions,
  narrowRequest,
  needsPermissionUpdate,
} from '../../utils/permissions';
import { getRedirectHost } from '../../utils/urlHelpers';
import { keepLaterExpiration } from '../../utils/vehicles';
import { LegalNotice } from '../Shared/LegalNotice';
import { ActionBar, Button, ErrorBox, Notice, Screen, ScreenHeader } from '../ui';
import { AccessItem, emailItem, fileItems, permissionItem } from './access';
import { getShareButtonLabel } from './shareButtonLabel';
import { AccessSummary } from './AccessSummary';
import { EmptyState } from './EmptyState';
import { TermsSheet } from './TermsSheet';
import {
  AddVehicleRow,
  Pager,
  ReadyVehicleRow,
  SharedVehicleRow,
  UnsupportedVehicleRow,
  VehicleGroup,
  VehicleSkeleton,
} from './VehicleList';
import { useAppName } from '../../hooks/useAppName';

type Translate = ReturnType<typeof useT>;

// Device definitions' powertrain_type values with copy; others show as sent.
const POWERTRAINS = ['BEV', 'PHEV', 'HEV', 'ICE', 'FCEV'];
const powertrainLabel = (t: Translate, type: string) =>
  POWERTRAINS.includes(type.toUpperCase())
    ? t(`powertrain.${type.toUpperCase()}` as TranslationKey)
    : type;

/** Why vehicles land in "Can't be shared", from the app's own filters. */
const unsupportedNote = (
  t: Translate,
  appName: string,
  { vehicleTokenIds, vehicleMakes, powertrainTypes }: VehicleManagerMandatoryParams,
): string | undefined => {
  if (vehicleTokenIds?.length) return t('share.unsupported.vehicles', { appName });
  const makes = vehicleMakes?.length ? formatList(vehicleMakes) : '';
  const powertrains = powertrainTypes?.length
    ? formatList(powertrainTypes.map((type) => powertrainLabel(t, type)))
    : '';
  if (makes && powertrains)
    return t('share.unsupported.makes_powertrains', { appName, makes, powertrains });
  if (makes) return t('share.unsupported.makes', { appName, makes });
  if (powertrains) return t('share.unsupported.powertrains', { appName, powertrains });
  return undefined;
};

/**
 * Choose vehicles to share with the app (grant new), or bring shares made
 * with older terms up to date (update). Continue (nothing new to share)
 * returns the token with an empty sharedVehicles. Cancel never returns the
 * token: the app gets an error instead.
 */
export const SelectVehicles: React.FC = () => {
  const t = useT();
  const { user } = useAuthContext();
  const credentials = useDevCredentials<VehicleManagerMandatoryParams>();
  const {
    clientId,
    redirectUri,
    utm,

    permissions,
    permissionTemplateId,
    cloudEvent,
    expirationDate,
    region,
  } = credentials;
  const appName = useAppName();
  const { componentData, setComponentData, setUiState, setBusy } = useUIManager();
  const { onboardingEnabled } = useOracles();
  const emailRequest = useEmailRequest();
  const hintId = useId();

  const { fetchVehicles, vehicles, incompatibleVehicles, hasNextPage, hasPreviousPage } =
    useFetchVehicles();
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [page, setPage] = useState(1);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<Text | null | undefined>(undefined);
  const [termsOpen, setTermsOpen] = useState(false);
  // Requested permissions and kinds of document the user switched off on the
  // request card, kept while they visit Manage or Add vehicle.
  const declinedKey = requestKey(clientId, permissions, permissionTemplateId);
  const [declined, setDeclinedState] = useState<Declined>(() =>
    loadDeclined(declinedKey),
  );
  const setDeclined = (next: Declined) => {
    setDeclinedState(next);
    saveDeclined(declinedKey, next);
  };

  // What the app asks for, and what's new compared with the shares it has.
  const requestedPermissions = useMemo(() => {
    try {
      return createPermissionsFromParams(permissions, permissionTemplateId);
    } catch (error) {
      console.error('Could not read the requested permissions:', error);
      return [];
    }
  }, [permissions, permissionTemplateId]);
  // What this share grants: the request less what was switched off. Until
  // something is, it's the app's request exactly as sent.
  const chosenPermissions = requestedPermissions.filter(
    (p) => !declined.permissions.includes(p),
  );
  const request = narrowRequest(permissions, permissionTemplateId, declined.permissions);
  const requestedFiles = toCloudEventAgreements(cloudEvent);
  const keptFiles = withoutKinds(requestedFiles, declined.files);
  // A share needs a permission (documents alone aren't shared), or, when the
  // app asks for documents only, at least one of them.
  const noPermissions = requestedPermissions.length > 0 && !chosenPermissions.length;
  const nothingOn = requestedPermissions.length
    ? noPermissions
    : requestedFiles.length > 0 && !keptFiles.length;

  // A vehicle's file access judged by the documents still switched on, from
  // what its grant shares now (read by the list). Until that's read, or with
  // nothing switched off, it's the list's own check of the whole request.
  const withChoices = (vehicle: Vehicle): Vehicle =>
    declined.files.length && vehicle.shared && vehicle.grantedFiles
      ? {
          ...vehicle,
          documentAccess: keptFiles.length
            ? coversAll(
                vehicle.grantedFiles,
                withSource(keptFiles, user?.smartContractAddress),
              )
            : undefined,
        }
      : vehicle;
  // Kinds of document switched off that the vehicle's grant shares now.
  const removedFilesOf = (vehicle: Vehicle) =>
    vehicle.shared && vehicle.grantedFiles
      ? kindsAmong(vehicle.grantedFiles, declined.files)
      : [];

  // A share made with older terms can be shared again: the new grant replaces
  // the old one and keeps what it had, less what's switched off (see
  // useShareVehicles). So a share needs an update when it lacks something
  // switched on, or has something switched off.
  const needsUpdate = (vehicle: Vehicle) =>
    needsPermissionUpdate(
      withChoices(vehicle),
      request.permissions,
      request.permissionTemplateId,
      declined.permissions,
    ) || removedFilesOf(vehicle).length > 0;
  const isSelectable = (vehicle: Vehicle) => !vehicle.shared || needsUpdate(vehicle);
  const outdated = vehicles.filter(needsUpdate);
  const {
    selectedVehicles: picked,
    handleVehicleSelect,
    handleToggleSelectAll,
    clearSelectedVehicles,
    allSelected,
    checkIfSelected,
  } = useSelectVehicles(vehicles.filter(isSelectable), outdated);
  // A picked share that switching items off made current drops out, and comes
  // back still picked if they're switched on again.
  const selectedVehicles = picked.filter(isSelectable);
  const shareVehicles = useShareVehicles();
  const finishShareVehicles = useFinishShareVehicles();

  const load = async (direction?: 'next' | 'previous') => {
    setListState('loading');
    try {
      await fetchVehicles(direction);
      setListState('ready');
    } catch (err) {
      captureException(err);
      setListState('error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "New" marks what the app asks for beyond its current shares, whether or
  // not it's switched on.
  const appOutdated = vehicles.filter((v) =>
    needsPermissionUpdate(v, permissions, permissionTemplateId),
  );
  const addedPermissions = getAddedPermissions(
    appOutdated,
    permissions,
    permissionTemplateId,
  );
  const filesMissing = appOutdated.some((v) => v.documentAccess === false);
  const items: AccessItem[] = [
    ...requestedPermissions.map((p) => ({
      ...permissionItem(p, t, addedPermissions.includes(p)),
      off: declined.permissions.includes(p),
    })),
    ...fileItems(requestedFiles, t, filesMissing).map((item) => ({
      ...item,
      off: !!item.fileKind && declined.files.includes(item.fileKind),
    })),
  ];
  const sharedItems = items.filter((item) => !item.off);
  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const toggleItem = ({ permission, fileKind }: AccessItem) => {
    if (sharing) return;
    setShareError(undefined);
    if (permission !== undefined) {
      setDeclined({ ...declined, permissions: toggle(declined.permissions, permission) });
    } else if (fileKind !== undefined) {
      setDeclined({ ...declined, files: toggle(declined.files, fileKind) });
    }
  };
  const end = shareEndOf(expirationDate);

  const addedFor = (vehicle: Vehicle) => [
    ...getAddedPermissions(
      [vehicle],
      request.permissions,
      request.permissionTemplateId,
    ).map(getPermissionLabel),
    ...getMissingFileLabels([withChoices(vehicle)], keptFiles),
  ];
  const removedFor = (vehicle: Vehicle) => [
    ...getRemovedPermissions(vehicle, declined.permissions).map(getPermissionLabel),
    ...removedFilesOf(vehicle).map((kind) => t(kind as TranslationKey)),
  ];

  const ready = vehicles.filter((v) => !v.shared);
  const shared = vehicles.filter((v) => v.shared);
  const paged = hasNextPage || hasPreviousPage;
  const loaded = listState === 'ready';
  const noVehicles =
    loaded && !paged && vehicles.length === 0 && incompatibleVehicles.length === 0;
  const selectableOnPage = vehicles.filter(isSelectable);
  // Nothing to choose: only Continue is offered.
  const nothingToShare =
    loaded && !paged && selectableOnPage.length === 0 && selectedVehicles.length === 0;

  const updateCount = selectedVehicles.filter((v) => v.shared).length;
  const shareCount = selectedVehicles.length - updateCount;
  const ctaLabel = getShareButtonLabel(shareCount, updateCount, t);

  const handleShare = async () => {
    setShareError(undefined);
    setSharing(true);
    setBusy(true);
    try {
      const { shared: done, skipped } = await shareVehicles(
        selectedVehicles,
        declined.permissions,
        declined.files,
      );
      const results: SharingResult[] = done.map((vehicle) => ({
        vehicle,
        outcome: vehicle.shared ? 'updated' : 'shared',
        expiration: vehicle.shared
          ? keepLaterExpiration(vehicle, expirationDate)
          : BigInt(expirationDate.toString()),
      }));
      clearSelectedVehicles();
      clearDeclined();
      // Approving the request approves its email item too.
      emailRequest.commit();
      finishShareVehicles(results, skipped);
    } catch (err) {
      captureException(err);
      // An expired session is sent back to sign-in elsewhere.
      if (!isInvalidSessionError(err)) {
        setShareError(err instanceof GrantUnreadableError ? err.toMessage() : null);
      }
    } finally {
      setSharing(false);
      setBusy(false);
    }
  };

  // Cancel ends the flow without a login: the app hears an error and never
  // gets the token. It leaves the email answer as it was; a required email
  // that was never shared is reported as a decline, as on the plain-login
  // step. Continue (nothing to share) approves the email item and signs in.
  const handleCancel = () => {
    const declinedEmail =
      emailRequest.asked && emailRequest.required && !emailRequest.granted;
    clearDeclined();
    sendErrorToParent(
      declinedEmail
        ? 'User declined to share their email'
        : 'User cancelled vehicle sharing',
      redirectUri,
      utm,
      setUiState,
    );
  };
  const handleContinue = () => {
    clearDeclined();
    emailRequest.commit();
    finishShareVehicles([]);
  };

  const handleManage = (vehicle: Vehicle) => {
    // Keeps the requested permissions VehicleManager put in componentData;
    // ManageVehicle reads what's switched off here from the same store.
    setComponentData({ ...componentData, vehicle });
    setUiState(UiStates.MANAGE_VEHICLE, { setBack: true });
  };

  const goToPage = (direction: 'next' | 'previous') => {
    setPage((current) => (direction === 'next' ? current + 1 : current - 1));
    load(direction);
  };

  const contract = (language?: Language) =>
    getTemplateDescription({
      email: user?.email ?? '',
      devLicenseAlias: appName,
      permissions: request.permissions,
      permissionTemplateId: request.permissionTemplateId,
      fileAgreements: keptFiles,
      expirationDate,
      region: region?.toUpperCase(),
      language,
    });

  // The action bar explains a disabled button, or asks to keep the window open.
  let hint: string | undefined;
  if (sharing) hint = t('share.keep_open');
  else if (!nothingToShare && nothingOn)
    hint =
      noPermissions && keptFiles.length
        ? t('share.hint.not_only_documents')
        : t('share.hint.permissions');
  else if (!nothingToShare && loaded && !selectedVehicles.length)
    hint = t('share.hint.select');

  const actions = (
    <ActionBar hint={hint} hintId={hintId}>
      <Button variant="secondary" onClick={handleCancel} disabled={sharing}>
        {t('common.cancel')}
      </Button>
      {nothingToShare || noVehicles ? (
        <Button onClick={handleContinue}>{t('common.continue')}</Button>
      ) : (
        <Button
          onClick={handleShare}
          loading={sharing}
          loadingLabel={t('share.sharing')}
          disabled={!loaded || !selectedVehicles.length || nothingOn}
          disabledReasonId={hintId}
        >
          {shareError !== undefined ? t('common.try_again') : ctaLabel}
        </Button>
      )}
    </ActionBar>
  );

  const note = unsupportedNote(t, appName, credentials);
  const addVehicle = onboardingEnabled ? (
    <AddVehicleRow onClick={() => setUiState(UiStates.ADD_VEHICLE, { setBack: true })} />
  ) : null;

  return (
    <Screen actions={actions}>
      <ScreenHeader
        title={t('share.title', { appName })}
        host={getRedirectHost(redirectUri)}
      />
      <AccessSummary
        items={items}
        email={
          emailRequest.asked && emailRequest.email
            ? {
                appName,
                email: emailRequest.email,
                required: emailRequest.required,
                shared: emailRequest.shared,
                onChange: emailRequest.setShared,
              }
            : undefined
        }
        end={end}
        onDetails={() => setTermsOpen(true)}
        onToggleItem={toggleItem}
        togglesDisabled={sharing}
      />

      {noVehicles ? (
        <EmptyState>{addVehicle}</EmptyState>
      ) : (
        <section className="flex flex-col gap-2.5" aria-labelledby={`${hintId}-vehicles`}>
          <div className="flex min-h-8 items-center justify-between gap-2">
            <h2 id={`${hintId}-vehicles`} className="text-card-title text-ink">
              {t('share.vehicles_heading')}
            </h2>
            {loaded && selectableOnPage.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleSelectAll}
                disabled={sharing}
              >
                {allSelected
                  ? t('share.deselect_all')
                  : paged
                    ? t('share.select_page')
                    : t('share.select_all')}
              </Button>
            )}
          </div>

          {shareError !== undefined && (
            <ErrorBox title={t('share.error.title')}>
              {shareError ? translateText(shareError, t) : t('share.error.body')}
            </ErrorBox>
          )}

          {listState === 'loading' && <VehicleSkeleton />}

          {listState === 'error' && (
            <Notice tone="warning" role="alert" title={t('share.load_error.title')}>
              <p>{t('share.load_error.body')}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => load()}
              >
                {t('common.try_again')}
              </Button>
            </Notice>
          )}

          {loaded && (
            <>
              {nothingToShare && shared.length > 0 && (
                <Notice tone="positive" title={t('share.all_shared.title')}>
                  {t('share.all_shared.body')}
                </Notice>
              )}
              {ready.length > 0 && (
                <VehicleGroup label={t('share.group.ready')} count={ready.length}>
                  {ready.map((vehicle) => (
                    <ReadyVehicleRow
                      key={vehicle.tokenId}
                      vehicle={vehicle}
                      selected={checkIfSelected(vehicle)}
                      onToggle={() => !sharing && handleVehicleSelect(vehicle)}
                    />
                  ))}
                  {addVehicle}
                </VehicleGroup>
              )}
              {shared.length > 0 && (
                <VehicleGroup label={t('share.group.shared')} count={shared.length}>
                  {shared.map((vehicle) => (
                    <SharedVehicleRow
                      key={vehicle.tokenId}
                      vehicle={vehicle}
                      needsUpdate={needsUpdate(vehicle)}
                      added={addedFor(vehicle)}
                      removed={removedFor(vehicle)}
                      selected={checkIfSelected(vehicle)}
                      onToggle={() => !sharing && handleVehicleSelect(vehicle)}
                      onManage={() => !sharing && handleManage(vehicle)}
                    />
                  ))}
                </VehicleGroup>
              )}
              {incompatibleVehicles.length > 0 && (
                <VehicleGroup
                  label={t('share.group.unsupported')}
                  count={incompatibleVehicles.length}
                  note={note}
                >
                  {incompatibleVehicles.map((vehicle) => (
                    <UnsupportedVehicleRow key={vehicle.tokenId} vehicle={vehicle} />
                  ))}
                </VehicleGroup>
              )}
              {!ready.length && addVehicle}
            </>
          )}

          <Pager
            page={page}
            hasNext={hasNextPage}
            hasPrevious={hasPreviousPage}
            onNext={() => goToPage('next')}
            onPrevious={() => goToPage('previous')}
            disabled={sharing || listState === 'loading'}
          />
        </section>
      )}

      <LegalNotice />
      <TermsSheet
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        items={
          emailRequest.asked && emailRequest.shared && emailRequest.email
            ? [emailItem(emailRequest.email, t), ...sharedItems]
            : sharedItems
        }
        end={end}
        contract={contract}
      />
    </Screen>
  );
};

export default SelectVehicles;
