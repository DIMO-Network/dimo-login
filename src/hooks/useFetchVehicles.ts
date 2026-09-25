import { useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { Vehicle } from '../models/vehicle';
import { fetchVehiclesWithTransformation } from '../services';
import {
  checkDocumentAccess,
  toCloudEventAgreements,
} from '../services/vehicleDocumentAgreements';
import { VehicleManagerMandatoryParams } from '../types';

export const useFetchVehicles = () => {
  const { user } = useAuthContext();
  const { clientId, vehicleTokenIds, vehicleMakes, powertrainTypes, cloudEvent } =
    useDevCredentials<VehicleManagerMandatoryParams>();
  const [startCursor, setStartCursor] = useState('');
  const [endCursor, setEndCursor] = useState('');
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [incompatibleVehicles, setIncompatibleVehicles] = useState<Vehicle[]>([]);
  // When the app asks for files, check each existing grant for them so a share
  // without file access is offered as an update. This runs after the list is
  // shown; the badge appears when the check returns.
  const checkFileAccess = (fetched: Vehicle[]) => {
    const requested = toCloudEventAgreements(cloudEvent);
    if (!requested.length) return;
    fetched
      .filter((vehicle) => vehicle.shared)
      .forEach(async (vehicle) => {
        // Reads are cached by grant source, so paging back doesn't refetch.
        const documentAccess = await checkDocumentAccess(
          vehicle,
          requested,
          user?.smartContractAddress,
        );
        // Only touch the vehicle if it's still in the list shown.
        setVehicles((current) =>
          current.map((v) =>
            v.tokenId === vehicle.tokenId && v.source === vehicle.source
              ? { ...v, documentAccess }
              : v,
          ),
        );
      });
  };

  const fetchVehicles = async (direction = 'next') => {
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
    setVehicles(transformedVehicles.compatibleVehicles);
    checkFileAccess(transformedVehicles.compatibleVehicles);
    setIncompatibleVehicles(transformedVehicles.incompatibleVehicles);
    setEndCursor(transformedVehicles.endCursor);
    setStartCursor(transformedVehicles.startCursor);
    setHasPreviousPage(transformedVehicles.hasPreviousPage);
    setHasNextPage(transformedVehicles.hasNextPage);
  };

  return {
    fetchVehicles,
    hasNextPage,
    hasPreviousPage,
    vehicles,
    incompatibleVehicles,
  };
};

export default useFetchVehicles;
