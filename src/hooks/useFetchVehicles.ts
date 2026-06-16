import { useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { Vehicle } from '../models/vehicle';
import { fetchVehiclesWithTransformation } from '../services';
import { VehicleManagerMandatoryParams } from '../types';

export const useFetchVehicles = () => {
  const { user } = useAuthContext();
  const {
    clientId,
    vehicleTokenIds,
    vehicleMakes,
    powertrainTypes,
    permissionTemplateId,
    permissions,
  } = useDevCredentials<VehicleManagerMandatoryParams>();
  const [startCursor, setStartCursor] = useState('');
  const [endCursor, setEndCursor] = useState('');
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [incompatibleVehicles, setIncompatibleVehicles] = useState<Vehicle[]>([]);
  const [hasVehicleWithOldPermissions, setHasVehicleWithOldPermissions] = useState(false);

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
      permissionTemplateId,
      permissions,
    });
    setVehicles(transformedVehicles.compatibleVehicles);
    setIncompatibleVehicles(transformedVehicles.incompatibleVehicles);
    setHasVehicleWithOldPermissions(transformedVehicles.hasVehicleWithOldPermissions);
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
    hasVehicleWithOldPermissions,
  };
};

export default useFetchVehicles;
