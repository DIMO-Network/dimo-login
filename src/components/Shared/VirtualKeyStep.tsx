import React, { FC } from 'react';
import { TeslaVehicle } from '../../types';

interface VirtualKeyStepProps {
  devLicenseAlias: string;
  vehicleToAdd?: TeslaVehicle;
}

export const VirtualKeyStep: FC<VirtualKeyStepProps> = ({
  devLicenseAlias,
  vehicleToAdd,
}) => (
  <>
    <div className="w-full text-gray-600 text-sm">
      {devLicenseAlias} requires access to your car’s data to offer you charging
      incentives.
    </div>

    <div className="w-full text-gray-600 text-sm mt-2">
      The virtual key provides end-to-end encryption, enables more frequent data updates,
      and allows for remote commands from your phone.
    </div>

    <div className="w-full text-gray-600 text-sm mt-2">
      This can be removed at any time in your Tesla app.{' '}
      <a
        href="https://www.tesla.com/support"
        className="text-black font-medium underline"
      >
        Learn more.
      </a>
      {vehicleToAdd && (
        <div className="flex items-center p-4 border rounded-2xl cursor-pointer transition hover:bg-gray-50 cursor-pointer mt-6">
          <img
            className="h-[48px] w-[48px] rounded-full object-cover mr-4"
            src={
              'https://assets.dimo.xyz/ipfs/QmaaxazmGtNM6srcRmLyNdjCp8EAmvaTDYSo1k2CXVRTaY'
            }
            alt={`${vehicleToAdd.make} ${vehicleToAdd.model}`}
          />
          <label htmlFor={`vehicle`} className="flex-grow text-left hover:cursor-pointer">
            <div className="text-black font-medium">
              {vehicleToAdd.make} {vehicleToAdd.model} ({vehicleToAdd.year})
            </div>
            <div className="text-sm text-gray-500 font-medium">
              VIN: {vehicleToAdd.vin}
            </div>
          </label>
        </div>
      )}
    </div>
  </>
);

export default VirtualKeyStep;