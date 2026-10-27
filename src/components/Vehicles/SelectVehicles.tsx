import React, { useEffect, useId, useMemo, useState } from 'react';
import { captureException } from '@sentry/react';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useOracles } from '../../context/OraclesContext';
import { useUIManager } from '../../context/UIManagerContext';
import { UiStates } from '../../enums';
import { useFetchVehicles, useFinishShareVehicles, useShareVehicles } from '../../hooks';
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
  getMissingFileLabels,
  GrantUnreadableError,
  toCloudEventAgreements,
} from '../../services/vehicleDocumentAgreements';
import { VehicleManagerMandatoryParams } from '../../types';
import { isInvalidSessionError } from '../../utils/authUtils';
import { sendErrorToParent } from '../../utils/errorUtils';
import { shareEndOf } from '../../utils/dateUtils';
import {
  getAddedPermissions,
  getPermissionLabel,
  needsPermissionUpdate,
} from '../../utils/permissions';
import { getRedirectHost } from '../../utils/urlHelpers';
import { keepLaterExpiration } from '../../utils/vehicles';
import { LegalNotice } from '../Shared/LegalNotice';
import { ActionBar, Button, ErrorBox, Notice, Screen, ScreenHeader } from '../ui';
import { emailItem, fileItems, permissionItem } from './access';
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
 * with older terms up to date (update). Cancel and Continue still return the
 * token to the app with an empty sharedVehicles (except Cancel on a required
 * email that isn't shared, which reports a decline).
 */
export const SelectVehicles: React.FC = () => {
  const t = useT();
  const { user } = useAuthContext();
  const credentials = useDevCredentials<VehicleManagerMandatoryParams>();
  const {
    devLicenseAlias,
    oemBrand,
    redirectUri,
    utm,
    tosUrl,
    privacyPolicyUrl,
    permissions,
    permissionTemplateId,
    cloudEvent,
    expirationDate,
    region,
  } = credentials;
  const appName = oemBrand?.name || devLicenseAlias;
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

  // A share made with older terms can be shared again: the new grant replaces
  // the old one and keeps what it had (see useShareVehicles).
  const needsUpdate = (vehicle: Vehicle) =>
    needsPermissionUpdate(vehicle, permissions, permissionTemplateId);
  const isSelectable = (vehicle: Vehicle) => !vehicle.shared || needsUpdate(vehicle);
  const outdated = vehicles.filter(needsUpdate);
  const {
    selectedVehicles,
    handleVehicleSelect,
    handleToggleSelectAll,
    clearSelectedVehicles,
    allSelected,
    checkIfSelected,
  } = useSelectVehicles(vehicles.filter(isSelectable), outdated);
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

  // What the app asks for, and what's new compared with the shares it has.
  const requestedPermissions = useMemo(() => {
    try {
      return createPermissionsFromParams(permissions, permissionTemplateId);
    } catch (error) {
      console.error('Could not read the requested permissions:', error);
      return [];
    }
  }, [permissions, permissionTemplateId]);
  const requestedFiles = toCloudEventAgreements(cloudEvent);
  const addedPermissions = getAddedPermissions(
    outdated,
    permissions,
    permissionTemplateId,
  );
  const filesMissing = outdated.some((v) => v.documentAccess === false);
  const items = [
    ...requestedPermissions.map((p) =>
      permissionItem(p, t, addedPermissions.includes(p)),
    ),
    ...fileItems(requestedFiles, t, filesMissing),
  ];
  const end = shareEndOf(expirationDate);

  const addedFor = (vehicle: Vehicle) => [
    ...getAddedPermissions([vehicle], permissions, permissionTemplateId).map(
      getPermissionLabel,
    ),
    ...getMissingFileLabels([vehicle], requestedFiles),
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
      const { shared: done, skipped } = await shareVehicles(selectedVehicles);
      const results: SharingResult[] = done.map((vehicle) => ({
        vehicle,
        outcome: vehicle.shared ? 'updated' : 'shared',
        expiration: vehicle.shared
          ? keepLaterExpiration(vehicle, expirationDate)
          : BigInt(expirationDate.toString()),
      }));
      clearSelectedVehicles();
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

  // Cancel leaves the email answer as it was; Continue (nothing to share)
  // still approves the email item. A required email that was never shared
  // ends the flow with a decline, as on the plain-login step, so the app
  // never gets a login without it.
  const handleCancel = () => {
    if (emailRequest.asked && emailRequest.required && !emailRequest.granted) {
      sendErrorToParent(
        'User declined to share their email',
        redirectUri,
        utm,
        setUiState,
      );
      return;
    }
    finishShareVehicles([]);
  };
  const handleContinue = () => {
    emailRequest.commit();
    finishShareVehicles([]);
  };

  const handleManage = (vehicle: Vehicle) => {
    // Keeps the requested permissions VehicleManager put in componentData.
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
      permissions,
      permissionTemplateId,
      fileAgreements: requestedFiles,
      expirationDate,
      region: region?.toUpperCase(),
      language,
    });

  // The action bar explains a disabled button, or asks to keep the window open.
  let hint: string | undefined;
  if (sharing) hint = t('share.keep_open');
  else if (!nothingToShare && loaded && !selectedVehicles.length)
    hint = t('share.hint.select');

  const actions = (
    <ActionBar hint={hint} hintId={hintId}>
      {nothingToShare || noVehicles ? (
        <Button onClick={handleContinue}>{t('common.continue')}</Button>
      ) : (
        <>
          <Button variant="secondary" onClick={handleCancel} disabled={sharing}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleShare}
            loading={sharing}
            loadingLabel={t('share.sharing')}
            disabled={!loaded || !selectedVehicles.length}
            disabledReasonId={hintId}
          >
            {shareError !== undefined ? t('common.try_again') : ctaLabel}
          </Button>
        </>
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

      <LegalNotice
        tosUrl={tosUrl}
        privacyPolicyUrl={privacyPolicyUrl}
        brandName={appName}
        poweredBy={!!oemBrand}
      />
      <TermsSheet
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        items={
          emailRequest.asked && emailRequest.shared && emailRequest.email
            ? [emailItem(emailRequest.email, t), ...items]
            : items
        }
        end={end}
        contract={contract}
      />
    </Screen>
  );
};

export default SelectVehicles;
