import React from "react";

import { Vehicle } from "../../models/vehicle";
import { UiStates, useUIManager } from "../../context/UIManagerContext";

interface VehicleCardProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
  incompatible: boolean;
}

const VehicleCard: React.FC<VehicleCardProps> = ({
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
        !disabled && "border"
      } rounded-2xl cursor-pointer transition ${
        vehicle.shared || incompatible
          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
          : "hover:bg-gray-50 border-gray-300 cursor-pointer"
      } ${isSelected && "border-black"}`}
    >
      {/* Custom Checkbox */}
      {!disabled && !incompatible && (
        <input
          type="checkbox"
          checked={isSelected || vehicle.shared}
          onChange={onSelect}
          id={`vehicle-${vehicle.tokenId.toString()}`}
          disabled={vehicle.shared}
          className="mr-4 w-5 h-5 text-black border-gray-300 rounded focus:ring-0 focus:ring-offset-0 accent-black cursor-pointer"
        />
      )}

      {incompatible && (
        <input
          type="checkbox"
          checked={true}
          onChange={onSelect}
          id={`vehicle-${vehicle.tokenId.toString()}`}
          disabled={true}
          className={`mr-4 w-5 h-5 border-gray-300 rounded appearance-none cursor-pointer bg-[#3C3C432E] text-white before:content-['X'] before:text-center before:text-white before:block disabled:cursor-not-allowed disabled:opacity-50`}
        />
      )}

      {/* Vehicle Image */}
      <img
        style={{ height: "48px", width: "48px" }}
        className="rounded-full object-cover mr-4"
        src={
          "https://assets.dimo.xyz/ipfs/QmaaxazmGtNM6srcRmLyNdjCp8EAmvaTDYSo1k2CXVRTaY"
        }
        alt={`${vehicle.make} ${vehicle.model}`}
      />

      {/* Vehicle Information */}
      <label
        htmlFor={`vehicle-${vehicle.tokenId.toString()}`}
        className="flex-grow text-left hover:cursor-pointer"
      >
        <div className="text-black">
          {vehicle.make} {vehicle.model} ({vehicle.year})
        </div>
        <div className="text-sm text-gray-500">
          ID: {vehicle.tokenId.toString()}
        </div>
        {vehicle.shared && (
          <div className="text-sm text-gray-500">
            Shared Until: {vehicle.expiresAt}
          </div>
        )}
      </label>

      {/* Manage Vehicle */}
      {vehicle.shared && (
        <div
          onClick={handleManageClick}
          className="flex justify-center items-center w-6 h-6 border border-gray-300 rounded-full cursor-pointer hover:border-gray-400 hover:bg-gray-100 hover:scale-105 transition duration-200"
        >
          <span className="text-black font-semibold text-xs mt-[-5px]">
            ...
          </span>
        </div>
      )}
    </div>
  );
};

export default VehicleCard;
