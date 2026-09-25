import React, { useEffect } from 'react';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { UIManagerLoaderWrapper } from '../Shared';
import { EmptyState } from './EmptyState';
import { VehicleManagerMandatoryParams } from '../../types';
import CompatibleVehicles from './CompatibleVehicles';
import IncompatibleVehicles from './IncompatibleVehicles';
import Footer from './Footer';
import useSelectVehicles from '../../hooks/useSelectVehicles';
import { useFetchVehicles, useFinishShareVehicles, useShareVehicles } from '../../hooks';
import PaginationButtons from './PaginationButtons';
import { AllVehiclesShared } from './AllVehiclesShared';
import { captureException } from '@sentry/react';
import { isInvalidSessionError } from '../../utils/authUtils';
import { getAddedPermissions, needsPermissionUpdate } from '../../utils/permissions';
import { PermissionUpdateNotice } from './PermissionUpdateNotice';
import { FilesRequestedNote } from './FilesRequestedNote';
import {
  getFileLabels,
  getMissingFileLabels,
  GrantUnreadableError,
  toCloudEventAgreements,
} from '../../services/vehicleDocumentAgreements';
import { Vehicle } from '../../models/vehicle';

export const SelectVehicles: React.FC = () => {
  const {
    devLicenseAlias,
    tosUrl,
    privacyPolicyUrl,
    oemBrand,
    permissions,
    permissionTemplateId,
    cloudEvent,
  } = useDevCredentials<VehicleManagerMandatoryParams>();
  const brandName = oemBrand?.name || devLicenseAlias;
  const { setLoadingState, setError, isLoading } = useUIManager();
  const {
    fetchVehicles: _fetchVehicles,
    vehicles,
    incompatibleVehicles,
    hasNextPage,
    hasPreviousPage,
  } = useFetchVehicles();
  // Vehicles shared with an older permission set can be shared again: the new
  // grant overwrites the old one, so there's nothing to revoke first.
  const needsUpdate = (vehicle: Vehicle) =>
    needsPermissionUpdate(vehicle, permissions, permissionTemplateId);
  const isSelectable = (vehicle: Vehicle) => !vehicle.shared || needsUpdate(vehicle);
  const outdatedVehicles = vehicles.filter(needsUpdate);
  const {
    selectedVehicles,
    handleVehicleSelect,
    handleToggleSelectAll,
    clearSelectedVehicles,
    allSelected,
    checkIfSelected,
  } = useSelectVehicles(vehicles.filter(isSelectable), outdatedVehicles);
  const handleShareVehicles = useShareVehicles();
  const finishShareVehicles = useFinishShareVehicles();

  const fetchVehiclesWithUI = async (direction?: string) => {
    try {
      setLoadingState(true, 'Fetching vehicles', true);
      await _fetchVehicles(direction);
    } catch (err) {
      captureException(err);
      setError('Could not fetch vehicles');
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    fetchVehiclesWithUI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = async () => {
    try {
      setLoadingState(true, 'Sharing vehicles', true);
      await handleShareVehicles(selectedVehicles);
      clearSelectedVehicles();
      // Updated shares show on the success screen like newly shared ones.
      finishShareVehicles(selectedVehicles.map((v) => ({ ...v, shared: false })));
    } catch (err) {
      captureException(err);
      if (err instanceof GrantUnreadableError) {
        setError(err.message);
      } else if (!isInvalidSessionError(err)) {
        setError('Failed to share vehicles');
      }
    } finally {
      setLoadingState(false);
    }
  };

  const onCancel = () => {
    finishShareVehicles([]);
  };

  const onNext = () => {
    fetchVehiclesWithUI();
  };

  const onPrevious = () => {
    fetchVehiclesWithUI('previous');
  };

  const noVehicles = vehicles.length === 0 && incompatibleVehicles.length === 0;
  const noCompatibleVehicles = vehicles.length === 0 && incompatibleVehicles.length > 0;
  const allShared =
    vehicles.length > 0 && vehicles.every((v) => v.shared) && !outdatedVehicles.length;
  const canShare = vehicles.some(isSelectable);
  const selectedUpdateCount = selectedVehicles.filter(needsUpdate).length;
  const requestedFiles = toCloudEventAgreements(cloudEvent);
  const missingFileLabels = getMissingFileLabels(outdatedVehicles, requestedFiles);
  // The update notice already lists missing files; otherwise, any share that
  // grants files says so here.
  const showFilesNote =
    requestedFiles.length > 0 && canShare && !missingFileLabels.length && !isLoading;

  return (
    <div className="flex flex-col w-full items-center justify-center box-border overflow-y-auto">
      {noVehicles && !isLoading && <EmptyState />}

      {allShared && <AllVehiclesShared devLicenseAlias={brandName} />}

      {!!outdatedVehicles.length && !isLoading && (
        <PermissionUpdateNotice
          brandName={brandName}
          vehicleCount={outdatedVehicles.length}
          addedPermissions={getAddedPermissions(
            outdatedVehicles,
            permissions,
            permissionTemplateId,
          )}
          addedFiles={missingFileLabels}
        />
      )}

      {showFilesNote && (
        <FilesRequestedNote brandName={brandName} fileLabels={getFileLabels(requestedFiles)} />
      )}

      <UIManagerLoaderWrapper>
        <>
          <div className="space-y-4 pt-4 max-h-[400px] overflow-auto w-full max-w-[440px]">
            {!!vehicles.length && (
              <CompatibleVehicles
                vehicles={vehicles}
                checkIfSelected={checkIfSelected}
                onSelect={handleVehicleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                allSelected={allSelected}
                isSelectable={isSelectable}
              />
            )}
            {!!incompatibleVehicles.length && (
              <IncompatibleVehicles
                vehicles={incompatibleVehicles}
                canConnectVehicles={noCompatibleVehicles}
              />
            )}
            <PaginationButtons
              hasNext={hasNextPage}
              hasPrevious={hasPreviousPage}
              onNext={onNext}
              onPrevious={onPrevious}
            />
          </div>
          <Footer
            canShare={canShare}
            onCancel={onCancel}
            onShare={handleShare}
            selectedVehiclesCount={selectedVehicles.length}
            selectedUpdateCount={selectedUpdateCount}
            tosUrl={tosUrl}
            privacyPolicyUrl={privacyPolicyUrl}
            brandName={brandName}
          />
        </>
      </UIManagerLoaderWrapper>
    </div>
  );
};

export default SelectVehicles;
