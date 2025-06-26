import React from 'react';
import VehicleCard from './VehicleCard';
import { Vehicle } from '../../models/vehicle';
import { ConnectCarButton } from '../Shared';

const CompatibleVehicles = ({
  vehicles,
  selectedVehicles,
  onSelect,
  onToggleSelectAll,
}: {
  vehicles: Vehicle[];
  selectedVehicles: Vehicle[];
  onSelect: (vehicle: Vehicle) => void;
  onToggleSelectAll: () => void;
}) => {
  return (
    <>
      <div className="flex justify-between">
        <h2 className="text-lg">Compatible</h2>
        <button
          onClick={onToggleSelectAll}
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
          onSelect={() => onSelect(vehicle)}
          disabled={false}
          incompatible={false}
        />
      ))}
    </>
  );
};

export default CompatibleVehicles;
