import React from 'react';
import VehicleCard from './VehicleCard';
import { Vehicle } from '../../models/vehicle';
import { ConnectCarButton } from '../Shared';

const CompatibleVehicles = ({
  vehicles,
  onSelect,
  onToggleSelectAll,
  allSelected,
  checkIfSelected,
  isSelectable,
}: {
  vehicles: Vehicle[];
  isSelectable: (vehicle: Vehicle) => boolean;
  onSelect: (vehicle: Vehicle) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  checkIfSelected: (vehicle: Vehicle) => boolean;
}) => {
  const handleSelect = (vehicle: Vehicle) => {
    if (isSelectable(vehicle)) {
      onSelect(vehicle);
    }
  };
  const hasSelectable = vehicles.some(isSelectable);

  return (
    <>
      <div className="flex justify-between">
        <h2 className="text-lg">Compatible</h2>
        {hasSelectable && (
          <button
            onClick={onToggleSelectAll}
            className="bg-white text-xs whitespace-nowrap text-[#09090B] border border-gray-300 px-3 py-1 rounded-full hover:border-gray-500"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>
      <div>
        <ConnectCarButton />
      </div>
      {vehicles.map((vehicle: Vehicle) => (
        <VehicleCard
          key={vehicle.tokenId.toString()}
          vehicle={vehicle}
          isSelected={checkIfSelected(vehicle)}
          onSelect={() => handleSelect(vehicle)}
          disabled={false}
          incompatible={false}
        />
      ))}
    </>
  );
};

export default CompatibleVehicles;
