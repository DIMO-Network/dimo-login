import React from 'react';

import { Vehicle } from '../../models/vehicle';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { Checkbox } from '../Shared/Checkbox';

interface VehicleCardProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
  incompatible: boolean;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  isSelected,
  onSelect,
  disabled,
  incompatible,
}) => {
  const { componentData, setComponentData, setUiState } = useUIManager(); // Access the manage function from the context

  const handleManageClick = (e: React.MouseEvent) => {
    setComponentData({ ...componentData, vehicle }); //Retains permissionTemplateID for Manage Vehicle
    setUiState(UiStates.MANAGE_VEHICLE, {
      setBack: true,
    });
  };

  return (
    <div
      className={`flex items-center p-4 ${
        !disabled && 'border'
      } rounded-2xl cursor-pointer transition ${
        vehicle.shared || incompatible
          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
          : 'hover:bg-gray-50 cursor-pointer'
      } ${isSelected && 'border-black'}`}
    >
      {/* Custom Checkbox */}
      {!disabled && !incompatible && (
        <Checkbox
          checked={isSelected || vehicle.shared}
          onChange={onSelect}
          id={`vehicle-${vehicle.tokenId.toString()}`}
          name={`vehicle-${vehicle.tokenId.toString()}`}
          className="mr-4 w-5 h-5 text-black border-gray-300 rounded focus:ring-0 focus:ring-offset-0 accent-black cursor-pointer"
          disabled={vehicle.shared}
        />
      )}

      {incompatible && (
        <Checkbox
          checked={true}
          onChange={onSelect}
          id={`vehicle-${vehicle.tokenId.toString()}`}
          name={`vehicle-${vehicle.tokenId.toString()}`}
          className="mr-4 w-5 h-5 border-gray-300 rounded appearance-none cursor-pointer bg-[#3C3C432E] text-white before:content-['X'] before:text-center before:text-white before:block disabled:cursor-not-allowed disabled:opacity-50"
          disabled={true}
        />
      )}

      {/* Vehicle Image */}
      <img
        className="h-[48px] w-[48px] rounded-full object-cover mr-4"
        src={
          'https://assets.dimo.xyz/ipfs/QmaaxazmGtNM6srcRmLyNdjCp8EAmvaTDYSo1k2CXVRTaY'
        }
        alt={`${vehicle.make} ${vehicle.model}`}
      />

      {/* Vehicle Information */}
      <label
        htmlFor={`vehicle-${vehicle.tokenId.toString()}`}
        className="flex-grow text-left hover:cursor-pointer"
      >
        <div className="text-black font-medium">
          {vehicle.make} {vehicle.model} ({vehicle.year})
        </div>
        <div className="text-sm text-gray-500 font-medium">
          ID: {vehicle.tokenId.toString()}
        </div>
        {vehicle.shared && (
          <div className="text-sm text-gray-500">Shared Until: {vehicle.expiresAt}</div>
        )}
      </label>

      {/* Manage Vehicle */}
      {vehicle.shared && (
        <div
          onClick={handleManageClick}
          className="flex justify-center items-center w-6 h-6 border border-gray-300 rounded-full cursor-pointer hover:border-gray-400 hover:bg-gray-100 hover:scale-105 transition duration-200"
        >
          <span className="text-black font-semibold text-xs mt-[-5px]">...</span>
        </div>
      )}
    </div>
  );
};

export default VehicleCard;
