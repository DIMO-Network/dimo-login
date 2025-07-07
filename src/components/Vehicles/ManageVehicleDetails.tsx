import { Vehicle } from '../../models/vehicle';
import Header from '../Shared/Header';
import React from 'react';

export const ManageVehicleDetails = ({ vehicle }: { vehicle: Vehicle }) => {
  return (
    <>
      <Header
        title={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
        subtitle={`ID:${vehicle.tokenId}`}
      />

      <img
        style={{ height: '80px', width: '80px' }}
        className="rounded-full object-cover mx-auto mt-8"
        src={
          'https://assets.dimo.xyz/ipfs/QmaaxazmGtNM6srcRmLyNdjCp8EAmvaTDYSo1k2CXVRTaY'
        }
        alt={`${vehicle.make} ${vehicle.model}`}
      />

      <p className="text-center mt-8">Shared until {vehicle.expiresAt}</p>
    </>
  );
};
