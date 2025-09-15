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

export const SelectVehicles: React.FC = () => {
  const { devLicenseAlias } = useDevCredentials<VehicleManagerMandatoryParams>();
  const { setLoadingState, setError, isLoading } = useUIManager();
  const {
    fetchVehicles: _fetchVehicles,
    vehicles,
    incompatibleVehicles,
    hasNextPage,
    hasPreviousPage,
    hasVehicleWithOldPermissions,
  } = useFetchVehicles();
  const {
    selectedVehicles,
    handleVehicleSelect,
    handleToggleSelectAll,
    clearSelectedVehicles,
    allSelected,
    checkIfSelected,
  } = useSelectVehicles(vehicles.filter((v) => !v.shared));
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
      finishShareVehicles(selectedVehicles);
    } catch (err) {
      captureException(err);
      if (!isInvalidSessionError(err)) {
        setError('Failed to share vehicles');
      }
    } finally {
      setLoadingState(false);
    }
  };

  const handleUpdatePermissions = async () => {
    try {
      setLoadingState(true, 'Updating vehicles permissions', true);
      const vehiclesWithOldPermissions = vehicles.filter(
        ({ hasOldPermissions }) => hasOldPermissions,
      );
      await handleShareVehicles(vehiclesWithOldPermissions);
    } catch (err) {
      captureException(err);
      if (!isInvalidSessionError(err)) {
        setError('Failed to update vehicles permissions');
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
  const allShared = vehicles.length > 0 && vehicles.every((v) => v.shared);
  const canShare = vehicles.some((v) => !v.shared);

  return (
    <div className="flex flex-col w-full items-center justify-center box-border overflow-y-auto">
      {noVehicles && !isLoading && <EmptyState />}

      {allShared && <AllVehiclesShared devLicenseAlias={devLicenseAlias} />}

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
            onUpdatePermissions={handleUpdatePermissions}
            hasVehicleWithOldPermissions={hasVehicleWithOldPermissions}
          />
        </>
      </UIManagerLoaderWrapper>
    </div>
  );
};

export default SelectVehicles;
