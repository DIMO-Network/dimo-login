import React, { useEffect, useState } from 'react';

import { useAuthContext } from '../../context/AuthContext';
import { Vehicle } from '../../models/vehicle';
import {
  AuthPayload,
  buildAuthPayload,
  sendAuthPayloadToParent,
} from '../../utils/authUtils';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { backToThirdParty } from '../../utils/messageHandler';
import { useUIManager } from '../../context/UIManagerContext';
import { ConnectedLoader } from '../Shared/Loader';
import { EmptyState } from './EmptyState';
import { VehicleManagerMandatoryParams } from '../../types';
import CompatibleVehicles from './CompatibleVehicles';
import IncompatibleVehicles from './IncompatibleVehicles';
import Footer from './Footer';
import useSelectVehicles from '../../hooks/useSelectVehicles';
import { useFetchVehicles, useShareVehicles } from '../../hooks';
import PaginationButtons from './PaginationButtons';
import { AllVehiclesShared } from './AllVehiclesShared';
import { captureException } from '@sentry/react';
import { UiStates } from '../../enums';

const useSendAuthPayloadToParent = () => {
  const { user, jwt } = useAuthContext();
  const { clientId, redirectUri } = useDevCredentials<VehicleManagerMandatoryParams>();

  return (
    extraPayload: Partial<AuthPayload> | null,
    handleNavigation: (authPayload: any) => void,
  ) => {
    if (jwt && redirectUri && clientId) {
      const authPayloadWithVehicles = {
        ...buildAuthPayload(clientId, jwt, user),
        ...extraPayload,
      };
      sendAuthPayloadToParent(authPayloadWithVehicles, redirectUri, () =>
        handleNavigation(authPayloadWithVehicles),
      );
    }
  };
};

const useFinishShareVehicles = () => {
  const { redirectUri, utm } = useDevCredentials<VehicleManagerMandatoryParams>();
  const { setUiState, setComponentData } = useUIManager();
  const sendAuthPayloadToParent = useSendAuthPayloadToParent();

  const goToNextScreen = (sharedVehicles: Vehicle[]) => {
    setComponentData({ action: 'shared', vehicles: sharedVehicles });
    setUiState(UiStates.VEHICLES_SHARED_SUCCESS);
  };

  return (sharedVehicles?: Vehicle[]) => {
    sendAuthPayloadToParent(
      {
        sharedVehicles: sharedVehicles?.map((v) => v.tokenId.toString()),
      },
      (authPayload) => {
        if (sharedVehicles?.length) {
          return goToNextScreen(sharedVehicles);
        }
        backToThirdParty(authPayload, redirectUri, utm);
      },
    );
  };
};

export const SelectVehicles: React.FC = () => {
  const { devLicenseAlias } = useDevCredentials<VehicleManagerMandatoryParams>();
  const { setLoadingState, setError } = useUIManager();
  const {
    fetchVehicles: _fetchVehicles,
    vehicles,
    incompatibleVehicles,
    hasNextPage,
    hasPreviousPage,
  } = useFetchVehicles();
  const {
    selectedVehicles,
    handleVehicleSelect,
    handleToggleSelectAll,
    clearSelectedVehicles,
  } = useSelectVehicles(vehicles.filter((v) => !v.shared));
  const handleShareVehicles = useShareVehicles();
  const [isLoading, setIsLoading] = useState(false);
  const finishShareVehicles = useFinishShareVehicles();

  const fetchVehiclesWithUI = async (direction?: string) => {
    try {
      setIsLoading(true);
      await _fetchVehicles(direction);
    } catch (err) {
      captureException(err);
      setError('Could not fetch vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiclesWithUI();
  }, []);

  const handleShare = async () => {
    try {
      setLoadingState(true, 'Sharing vehicles', true);
      await handleShareVehicles(selectedVehicles);
      clearSelectedVehicles();
      finishShareVehicles(selectedVehicles);
    } catch (err) {
      captureException(err);
      setError('Could not share vehicles');
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

      {isLoading ? (
        <ConnectedLoader />
      ) : (
        <div className="space-y-4 pt-4 max-h-[400px] overflow-auto w-full max-w-[440px]">
          {!!vehicles.length && (
            <CompatibleVehicles
              vehicles={vehicles}
              selectedVehicles={selectedVehicles}
              onSelect={handleVehicleSelect}
              onToggleSelectAll={handleToggleSelectAll}
            />
          )}
          {!!incompatibleVehicles.length && (
            <IncompatibleVehicles
              vehicles={incompatibleVehicles}
              showConnectVehicleButton={noCompatibleVehicles}
            />
          )}
          <PaginationButtons
            hasNext={hasNextPage}
            hasPrevious={hasPreviousPage}
            onNext={onNext}
            onPrevious={onPrevious}
          />
        </div>
      )}
      <Footer
        canShare={canShare}
        onCancel={onCancel}
        onShare={handleShare}
        selectedVehiclesCount={selectedVehicles.length}
      />
    </div>
  );
};

export default SelectVehicles;
