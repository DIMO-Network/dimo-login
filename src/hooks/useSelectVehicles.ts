import { useEffect, useState } from 'react';
import { Vehicle } from '../models/vehicle';

// preselectedVehicles (e.g. shares that need a permission update) are added to
// the selection whenever a new page of vehicles loads.
const useSelectVehicles = (
  shareableVehicles: Vehicle[],
  preselectedVehicles: Vehicle[] = [],
) => {
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);

  const preselectKey = preselectedVehicles.map((v) => v.tokenId).join(',');
  useEffect(() => {
    if (!preselectedVehicles.length) return;
    setSelectedVehicles((prevSelected) => [
      ...prevSelected,
      ...preselectedVehicles.filter(
        (v) => !prevSelected.some((p) => p.tokenId === v.tokenId),
      ),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectKey]);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicles((prevSelected) =>
      prevSelected.includes(vehicle)
        ? prevSelected.filter((v) => v !== vehicle)
        : [...prevSelected, vehicle],
    );
  };

  const clearSelectedVehicles = () => {
    setSelectedVehicles([]);
  };

  const handleToggleSelectAll = () => {
    const allSelected = shareableVehicles.every((vehicle) =>
      selectedVehicles.includes(vehicle),
    );
    setSelectedVehicles(allSelected ? [] : shareableVehicles);
  };

  const allSelected =
    shareableVehicles.length > 0 &&
    shareableVehicles.every((vehicle) => selectedVehicles.includes(vehicle));

  const checkIfSelected = (vehicle: Vehicle) => {
    return selectedVehicles.includes(vehicle);
  };

  return {
    selectedVehicles,
    handleVehicleSelect,
    clearSelectedVehicles,
    handleToggleSelectAll,
    allSelected,
    checkIfSelected,
  };
};

export default useSelectVehicles;
