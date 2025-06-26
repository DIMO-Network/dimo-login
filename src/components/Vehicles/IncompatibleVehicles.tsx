import React from 'react';
import VehicleCard from './VehicleCard';
import { Vehicle } from '../../models/vehicle';
import { ConnectCarButton } from '../Shared/ConnectCarButton';

const IncompatibleVehicles = ({
  vehicles,
  showConnectVehicleButton,
}: {
  vehicles: Vehicle[];
  showConnectVehicleButton: boolean;
}) => {
  return (
    <>
      <h2 className="text-lg">Incompatible</h2>
      {showConnectVehicleButton && (
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