import { useState } from 'react';
import { Vehicle } from '../models/vehicle';

const useSelectVehicles = (shareableVehicles: Vehicle[]) => {
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);

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

  return {
    selectedVehicles,
    handleVehicleSelect,
    clearSelectedVehicles,
    handleToggleSelectAll,
  };
};

export default useSelectVehicles; 