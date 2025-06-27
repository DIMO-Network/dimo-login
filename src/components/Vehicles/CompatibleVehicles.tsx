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
}: {
  vehicles: Vehicle[];
  onSelect: (vehicle: Vehicle) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  checkIfSelected: (vehicle: Vehicle) => boolean;
}) => {
  return (
    <>
      <div className="flex justify-between">
        <h2 className="text-lg">Compatible</h2>
        <button
          onClick={onToggleSelectAll}
          className="bg-white text-xs w-[75px] text-[#09090B] border border-gray-300 pr-px pl-px py-1 rounded-full hover:border-gray-500"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div>
        <ConnectCarButton />
      </div>
      {vehicles.map((vehicle: Vehicle) => (
        <VehicleCard
          key={vehicle.tokenId.toString()}
          vehicle={vehicle}
          isSelected={checkIfSelected(vehicle)}
          onSelect={() => onSelect(vehicle)}
          disabled={false}
          incompatible={false}
        />
      ))}
    </>
  );
};

export default CompatibleVehicles;
