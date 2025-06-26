import React, { useEffect, useState, useRef } from 'react';

import {
  SetVehiclePermissions,
  SetVehiclePermissionsBulk,
} from '@dimo-network/transactions';

import VehicleCard from './VehicleCard';
import { useAuthContext } from '../../context/AuthContext';
import { Vehicle } from '../../models/vehicle';
import {
  generateIpfsSources,
  setVehiclePermissions,
  setVehiclePermissionsBulk,
} from '../../services/turnkeyService';
import { buildAuthPayload, sendAuthPayloadToParent } from '../../utils/authUtils';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { getPermsValue } from '../../services/permissionsService';
import PrimaryButton from '../Shared/PrimaryButton';
import { backToThirdParty } from '../../utils/messageHandler';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { ConnectedLoader } from '../Shared/Loader';
import { EmptyState } from './EmptyState';
import { ConnectCarButton } from '../Shared/ConnectCarButton';
import { fetchVehiclesWithTransformation } from '../../services/vehicleService';
import { VehicleManagerMandatoryParams } from '../../types/params';
import CompatibleVehicles from './CompatibleVehicles';
import IncompatibleVehicles from './IncompatibleVehicles';
import Footer from './Footer';
import useSelectVehicles from '../../hooks/useSelectVehicles';
import useFetchVehicles from '../../hooks/useFetchVehicles';

export const SelectVehicles: React.FC = () => {
  const { user, jwt, validateSession } = useAuthContext();
  const {
    clientId,
    redirectUri,
    utm,
    devLicenseAlias,
    expirationDate,
    permissionTemplateId,
  } = useDevCredentials<VehicleManagerMandatoryParams>();
  const { setUiState, setComponentData, setLoadingState, componentData, setError } =
    useUIManager();
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  const { fetchVehicles, vehicles, incompatibleVehicles, hasNextPage, hasPreviousPage } =
    useFetchVehicles();
  const {
    selectedVehicles,
    handleVehicleSelect,
    clearSelectedVehicles,
    handleToggleSelectAll,
  } = useSelectVehicles(vehicles.filter((v) => !v.shared));

  const sendJwtAfterPermissions = (handleNavigation: (authPayload: any) => void) => {
    if (jwt && redirectUri && clientId) {
      const authPayload = buildAuthPayload(clientId, jwt, user);
      const authPayloadWithVehicles = {
        ...authPayload,
        sharedVehicles: selectedVehicles.map((vehicle: Vehicle) =>
          vehicle.tokenId.toString(),
        ),
      };
      sendAuthPayloadToParent(authPayloadWithVehicles, redirectUri, () =>
        handleNavigation(authPayloadWithVehicles),
      );
    }
  };

  const handleContinue = () => {
    sendJwtAfterPermissions((authPayload: any) => {
      backToThirdParty(authPayload, redirectUri, utm);
    });
  };

  const createBasePermissions = (perms: bigint, sources: string) => ({
    grantee: clientId as `0x${string}`,
    permissions: perms,
    expiration: expirationDate,
    source: sources,
  });

  const shareSingleVehicle = async (tokenId: string, basePermissions: any) => {
    const vehiclePermissions: SetVehiclePermissions = {
      ...basePermissions,
      tokenId: BigInt(tokenId),
    };
    await setVehiclePermissions(vehiclePermissions);
  };

  const shareMultipleVehicles = async (tokenIds: string[], basePermissions: any) => {
    const bulkVehiclePermissions: SetVehiclePermissionsBulk = {
      ...basePermissions,
      tokenIds: tokenIds.map((id) => BigInt(id)),
    };
    await setVehiclePermissionsBulk(bulkVehiclePermissions);
  };

  const handleShare = async () => {
    if (!permissionTemplateId || selectedVehicles.length === 0 || !clientId) {
      setError('No vehicles selected');
      return;
    }

    setLoadingState(true, 'Sharing vehicles', true);

    try {
      const hasValidSession = await validateSession();
      if (!hasValidSession) {
        return;
      }
      const unsharedTokenIds = selectedVehicles
        .filter((vehicle) => !vehicle.shared)
        .map((vehicle) => vehicle.tokenId.toString());

      if (unsharedTokenIds.length === 0) {
        setLoadingState(false);
        return;
      }

      const perms = getPermsValue(permissionTemplateId);
      const sources = await generateIpfsSources(perms, clientId, expirationDate);
      const basePermissions = createBasePermissions(perms, sources);

      if (unsharedTokenIds.length === 1) {
        await shareSingleVehicle(unsharedTokenIds[0], basePermissions);
      } else {
        await shareMultipleVehicles(unsharedTokenIds, basePermissions);
      }

      sendJwtAfterPermissions((authPayload: any) => {
        setComponentData({ action: 'shared', vehicles: selectedVehicles });
        setUiState(UiStates.VEHICLES_SHARED_SUCCESS);
        clearSelectedVehicles();
      });
    } catch (error) {
      setError('Could not share vehicles');
      console.error('Error sharing vehicles:', error);
    } finally {
      setLoadingState(false);
    }
  };

  const onNext = () => {
    setVehiclesLoading(true);
    fetchVehicles();
  };

  const onPrevious = () => {
    setVehiclesLoading(true);
    fetchVehicles('previous');
  };

  const noVehicles = vehicles.length === 0 && incompatibleVehicles.length === 0;
  const noCompatibleVehicles = vehicles.length === 0 && incompatibleVehicles.length > 0;
  const allShared = vehicles.length > 0 && vehicles.every((v) => v.shared);
  const canShare = vehicles.some((v) => !v.shared);

  return (
    <div className="flex flex-col w-full items-center justify-center box-border overflow-y-auto">
      {noVehicles && !vehiclesLoading && <EmptyState />}

      {allShared && <AllVehiclesShared devLicenseAlias={devLicenseAlias} />}

      {vehiclesLoading ? (
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
        onContinue={handleContinue}
        onShare={handleShare}
        selectedVehiclesCount={selectedVehicles.length}
      />
    </div>
  );
};

const PaginationButtons = ({
  hasNext,
  hasPrevious,
  onPrevious,
  onNext,
}: {
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
}) => {
  if (!(hasNext || hasPrevious)) {
    return null;
  }
  return (
    <div className="flex justify-center space-x-4 mt-4">
      {hasPrevious && (
        <PrimaryButton onClick={onPrevious} width="w-[214px]">
          Back
        </PrimaryButton>
      )}
      {hasNext && (
        <PrimaryButton onClick={onNext} width="w-[214px]">
          Next
        </PrimaryButton>
      )}
    </div>
  );
};

const AllVehiclesShared = ({ devLicenseAlias }: { devLicenseAlias: string }) => {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-gray-500 text-xl font-medium pt-2">
        All vehicles have been shared
      </h2>
      <p className="text-sm">
        You have already shared all your vehicles with {devLicenseAlias}.
      </p>
    </div>
  );
};

export default SelectVehicles;
