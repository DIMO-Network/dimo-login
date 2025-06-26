import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { Vehicle } from '../models/vehicle';
import { fetchVehiclesWithTransformation } from '../services/vehicleService';
import { VehicleManagerMandatoryParams } from '../types/params';

const useFetchVehicles = () => {
  const { user } = useAuthContext();
  const { clientId, vehicleTokenIds, vehicleMakes, powertrainTypes } =
    useDevCredentials<VehicleManagerMandatoryParams>();
  const [startCursor, setStartCursor] = useState('');
  const [endCursor, setEndCursor] = useState('');
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [incompatibleVehicles, setIncompatibleVehicles] = useState<Vehicle[]>([]);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    Promise.all([fetchVehicles()]);
  }, []);

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
    setIsLoading(false);
    setVehicles(transformedVehicles.compatibleVehicles);
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
    isLoading,
    vehicles,
    incompatibleVehicles,
  };
};

export default useFetchVehicles; 