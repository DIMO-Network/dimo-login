import React from 'react';
import { Vehicle } from '../../models/vehicle';

interface VehicleCardProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, isSelected, onSelect, disabled }) => (
  <div
    className={`flex items-center p-4 border rounded-lg cursor-pointer ${
      disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'hover:bg-gray-50'
    }`}
    onClick={!disabled ? onSelect : undefined}
  >
    <input 
      type="checkbox" 
      checked={isSelected} 
      onChange={onSelect} 
      id={`vehicle-${vehicle.tokenId.toString()}`}
      disabled={disabled}
      className="mr-4"
    />
    <label htmlFor={`vehicle-${vehicle.tokenId.toString()}`} className="flex-grow text-left">
      <span className="font-semibold">
        {vehicle.make} {vehicle.model} ({vehicle.year})
      </span>
      <span className="text-sm ml-2">
        - Vehicle ID: {vehicle.tokenId.toString()}
      </span>
      {vehicle.shared && (
        <span className="ml-2 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded">
          Shared
        </span>
      )}
    </label>
  </div>
);

export default VehicleCard;
