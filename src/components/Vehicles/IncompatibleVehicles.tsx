import React from 'react';
import VehicleCard from './VehicleCard';
import { Vehicle } from '../../models/vehicle';
import { ConnectCarButton } from '../Shared/ConnectCarButton';

const IncompatibleVehicles = ({
  vehicles,
  canConnectVehicles,
}: {
  vehicles: Vehicle[];
  canConnectVehicles: boolean;
}) => {
  return (
    <>
      <h2 className="text-lg">Incompatible</h2>
      {canConnectVehicles && (
        <div>
          <ConnectCarButton />
        </div>
      )}
      {vehicles.map((vehicle: Vehicle) => (
        <VehicleCard
          key={vehicle.tokenId.toString()}
          vehicle={vehicle}
          isSelected={false}
          onSelect={() => {}}
          disabled={false}
          incompatible={true}
        />
      ))}
    </>
  );
};

export default IncompatibleVehicles;
