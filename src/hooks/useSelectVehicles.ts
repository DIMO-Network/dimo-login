import { useEffect, useRef, useState } from 'react';
import { Vehicle } from '../models/vehicle';

// Selection is keyed by tokenId: every fetch (including paging back) builds new
// Vehicle objects, so reference equality would drift from what's on screen.
const sameVehicle = (a: Vehicle) => (b: Vehicle) => a.tokenId === b.tokenId;

// preselectedVehicles (e.g. shares that need a permission update) are selected
// the first time each one appears. After that the user's choice stands, even
// when paging brings the vehicle back.
const useSelectVehicles = (
  shareableVehicles: Vehicle[],
  preselectedVehicles: Vehicle[] = [],
) => {
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);
  const offeredTokenIds = useRef(new Set<number>());

  const preselectKey = preselectedVehicles.map((v) => v.tokenId).join(',');
  useEffect(() => {
    const fresh = preselectedVehicles.filter(
      (v) => !offeredTokenIds.current.has(v.tokenId),
    );
    if (!fresh.length) return;
    fresh.forEach((v) => offeredTokenIds.current.add(v.tokenId));
    setSelectedVehicles((prevSelected) => [
      ...prevSelected,
      ...fresh.filter((v) => !prevSelected.some(sameVehicle(v))),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectKey]);

  const checkIfSelected = (vehicle: Vehicle) =>
    selectedVehicles.some(sameVehicle(vehicle));

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicles((prevSelected) =>
      prevSelected.some(sameVehicle(vehicle))
        ? prevSelected.filter((v) => v.tokenId !== vehicle.tokenId)
        : [...prevSelected, vehicle],
    );
  };

  const clearSelectedVehicles = () => {
    setSelectedVehicles([]);
  };

  const allSelected =
    shareableVehicles.length > 0 && shareableVehicles.every(checkIfSelected);

  const handleToggleSelectAll = () => {
    setSelectedVehicles((prevSelected) =>
      allSelected
        ? prevSelected.filter((v) => !shareableVehicles.some(sameVehicle(v)))
        : [
            ...prevSelected,
            ...shareableVehicles.filter((v) => !prevSelected.some(sameVehicle(v))),
          ],
    );
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
