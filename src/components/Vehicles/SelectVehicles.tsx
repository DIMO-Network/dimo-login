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

export const SelectVehicles: React.FC = () => {
  const { user, jwt, validateSession } = useAuthContext();
  const {
    clientId,
    redirectUri,
    utm,
    devLicenseAlias,
    vehicleTokenIds,
    vehicleMakes,
    powertrainTypes,
    expirationDate,
    permissionTemplateId,
  } = useDevCredentials<VehicleManagerMandatoryParams>();
  const { setUiState, setComponentData, setLoadingState, componentData, setError } =
    useUIManager();
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [incompatibleVehicles, setIncompatibleVehicles] = useState<Vehicle[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState('');
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [startCursor, setStartCursor] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);
  const hasFetched = useRef(false);

  const fetchVehicles = async (direction = 'next') => {
    try {
      const cursor = direction === 'next' ? endCursor : startCursor;

      const transformedVehicles = await fetchVehiclesWithTransformation({
        ownerAddress: user.smartContractAddress,
        targetGrantee: clientId,
        cursor,
        direction,
        filters: {
          vehicleTokenIds,
          vehicleMakes,
          powertrainTypes,
        },
      });

      setVehiclesLoading(false);
      setVehicles(transformedVehicles.compatibleVehicles);
      setIncompatibleVehicles(transformedVehicles.incompatibleVehicles);
      setEndCursor(transformedVehicles.endCursor);
      setStartCursor(transformedVehicles.startCursor);
      setHasPreviousPage(transformedVehicles.hasPreviousPage);
      setHasNextPage(transformedVehicles.hasNextPage);
      setError(null);

      if (componentData && componentData.preSelectedVehicles) {
        const matchedVehicle = transformedVehicles.compatibleVehicles.find(
          (vehicle) =>
            vehicle.tokenId.toString() === componentData.preSelectedVehicles[0],
        );
        if (matchedVehicle) {
          handleVehicleSelect(matchedVehicle);
        }
      }
    } catch (error) {
      setVehiclesLoading(false);
      setError('Could not fetch vehicles');
      console.error('Error fetching vehicles:', error);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return; // Prevents re-execution, which happens in dev due to strict mode
    hasFetched.current = true;

    Promise.all([fetchVehicles()]);
  }, []);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicles(
      (prevSelected) =>
        prevSelected.includes(vehicle)
          ? prevSelected.filter((v) => v !== vehicle) // Deselect if already selected
          : [...prevSelected, vehicle], // Add to selected if not already selected
    );
  };

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
        setSelectedVehicles([]);
      });
    } catch (error) {
      setError('Could not share vehicles');
      console.error('Error sharing vehicles:', error);
    } finally {
      setLoadingState(false);
    }
  };

  const handleToggleSelectAll = () => {
    const nonSharedVehicles = vehicles.filter((vehicle) => !vehicle.shared);

    // Check if all non-shared vehicles are already selected
    const allSelected = nonSharedVehicles.every((vehicle) =>
      selectedVehicles.includes(vehicle),
    );

    // Toggle selection
    setSelectedVehicles(allSelected ? [] : nonSharedVehicles);
  };

  const noVehicles = vehicles.length === 0 && incompatibleVehicles.length === 0;
  const noCompatibleVehicles = vehicles.length === 0 && incompatibleVehicles.length > 0;
  const allShared = vehicles.length > 0 && vehicles.every((v) => v.shared);
  const canShare = vehicles.some((v) => !v.shared);

  return (
    <div className="flex flex-col w-full items-center justify-center box-border overflow-y-auto">
      {noVehicles && !vehiclesLoading && <EmptyState />}

      {allShared && (
        <div className="flex flex-col items-center">
          <h2 className="text-gray-500 text-xl font-medium pt-2">
            All vehicles have been shared
          </h2>
          <p className="text-sm">
            You have already shared all your vehicles with {devLicenseAlias}.
          </p>
        </div>
      )}

      {vehiclesLoading ? (
        <ConnectedLoader />
      ) : (
        <div className="space-y-4 pt-4 max-h-[400px] overflow-auto w-full max-w-[440px]">
          {/* Render Compatible Vehicles */}
          {vehicles && vehicles.length > 0 && (
            <>
              <div className="flex justify-between">
                <h2 className="text-lg">Compatible</h2>
                <button
                  onClick={handleToggleSelectAll}
                  className="bg-white text-xs w-[75px] text-[#09090B] border border-gray-300 pr-px pl-px py-1 rounded-full hover:border-gray-500"
                >
                  {vehicles
                    .filter((vehicle) => !vehicle.shared)
                    .every((vehicle) => selectedVehicles.includes(vehicle))
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              <div>
                <ConnectCarButton />
              </div>
              {vehicles.map((vehicle: Vehicle) => (
                <VehicleCard
                  key={vehicle.tokenId.toString()}
                  vehicle={vehicle}
                  isSelected={selectedVehicles.includes(vehicle)}
                  onSelect={() => handleVehicleSelect(vehicle)}
                  disabled={false}
                  incompatible={false}
                />
              ))}
            </>
          )}

          {/* Render Incompatible Vehicles */}
          {incompatibleVehicles && incompatibleVehicles.length > 0 && (
            <>
              <h2 className="text-lg">Incompatible</h2>
              {noCompatibleVehicles && (
                <div>
                  <ConnectCarButton />
                </div>
              )}
              {incompatibleVehicles.map((vehicle: Vehicle) => (
                <VehicleCard
                  key={vehicle.tokenId.toString()}
                  vehicle={vehicle}
                  isSelected={selectedVehicles.includes(vehicle)} //Wont execute since disabled
                  onSelect={() => handleVehicleSelect(vehicle)} //Wont execute since disabled
                  disabled={false}
                  incompatible={true}
                />
              ))}
            </>
          )}

          {/* Pagination Buttons */}
          {(hasNextPage || hasPreviousPage) && (
            <div className="flex justify-center space-x-4 mt-4">
              {hasPreviousPage && (
                <PrimaryButton
                  onClick={() => {
                    setVehiclesLoading(true);
                    fetchVehicles('previous');
                  }}
                  width="w-[214px]"
                >
                  Back
                </PrimaryButton>
              )}
              {hasNextPage && (
                <PrimaryButton
                  onClick={() => {
                    setVehiclesLoading(true);
                    fetchVehicles();
                  }}
                  width="w-[214px]"
                >
                  Next
                </PrimaryButton>
              )}
            </div>
          )}
        </div>
      )}

      {/* Render buttons */}
      <div
        className={`grid grid-flow-col auto-cols-fr gap-4 ${
          canShare ? 'justify-between' : 'justify-center'
        } w-full max-w-[440px] pt-4`}
      >
        {(noVehicles || allShared || noCompatibleVehicles) && (
          <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
        )}
        {canShare && (
          <>
            <button
              onClick={handleContinue}
              className="bg-white font-medium text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleShare} disabled={selectedVehicles.length === 0}>
              Save changes
            </PrimaryButton>
          </>
        )}
      </div>
    </div>
  );
};

export default SelectVehicles;
