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
    className={`flex items-center p-4 border rounded-2xl cursor-pointer transition ${
      vehicle.shared ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'hover:bg-gray-50 border-gray-300'
    } ${isSelected && "border-black"}`}
  >
    {/* Custom Checkbox */}
    <input
      type="checkbox"
      checked={isSelected || vehicle.shared}
      onChange={onSelect}
      id={`vehicle-${vehicle.tokenId.toString()}`}
      disabled={vehicle.shared}
      className="mr-4 w-5 h-5 text-black border-gray-300 rounded focus:ring-0 focus:ring-offset-0 accent-black"
    />

    {/* Vehicle Image */}
    <img
      style={{ height: "48px", width: "48px" }}
      className="rounded-full object-cover mr-4"
      src={"https://assets.dimo.xyz/ipfs/QmaaxazmGtNM6srcRmLyNdjCp8EAmvaTDYSo1k2CXVRTaY"}
      alt={`${vehicle.make} ${vehicle.model}`}
    />

    {/* Vehicle Information */}
    <label htmlFor={`vehicle-${vehicle.tokenId.toString()}`} className="flex-grow text-left">
      <div className="font-semibold text-black">
        {vehicle.make} {vehicle.model} ({vehicle.year})
      </div>
      <div className="text-sm text-gray-500">
        ID: {vehicle.tokenId.toString()}
      </div>
    </label>

    {/* Shared Badge */}
    {vehicle.shared && (
      <span className="ml-2 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-xl">
        Shared
      </span>
    )}
  </div>
);

export default VehicleCard;
