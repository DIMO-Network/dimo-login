// src/components/SuccessPage.tsx
import React from 'react';

import Card from '../Shared/Card';
import Header from '../Shared/Header';
import PrimaryButton from '../Shared/PrimaryButton';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { buildAuthPayload } from '../../utils/authUtils';
import { useAuthContext } from '../../context/AuthContext';
import { backToThirdParty } from '../../utils/messageHandler';
import { Vehicle } from '../../models/vehicle';
import VehicleCard from './VehicleCard';
import { isEmbed } from '../../utils/isEmbed';

const SuccessfulPermissions: React.FC = () => {
  const { redirectUri, utm, devLicenseAlias, clientId } = useDevCredentials();
  const { jwt, user } = useAuthContext();
  const {
    componentData: { vehicles, action },
  } = useUIManager();

  const handleBackToThirdParty = () => {
    //If Dev is using popup mode, we simply exit the flow here and close the window
    //By this point the dev should already have the transaction data, so this screen is mainly for the users UX, for them to know what happened
    //Redirect mode however, the user controls when the data is sent because we need to perform a redirect

    const authPayload = buildAuthPayload(clientId, jwt, user);

    const vehicleTokenIds = vehicles.map((vehicle: Vehicle) => vehicle.tokenId);

    const payload = {
      ...authPayload,
      [`${action}Vehicles`]: vehicleTokenIds,
    };
    backToThirdParty(payload, redirectUri, utm);

    //Shared vehicles to be fetched through urlParams.getAll("sharedVehicles")
  };

  return (
    <Card
      width="w-full max-w-[600px]"
      height="h-fit max-h-[770px]"
      className="flex flex-col gap-6 items-center"
    >
      <Header title={`You have successfully ${action} your vehicles!`} subtitle={''} />
      <div className="flex flex-col gap-4 max-h-[400px] overflow-auto w-full max-w-[440px]">
        {vehicles &&
          vehicles.length > 0 &&
          vehicles.map((vehicle: Vehicle) => (
            <VehicleCard
              key={vehicle.tokenId.toString()}
              vehicle={vehicle}
              isSelected={false}
              onSelect={() => console.log('yee')}
              disabled={true}
              incompatible={false}
            />
          ))}
      </div>
      <div className="flex fex-col">
        {!isEmbed() && (
          <div className="flex justify-center">
            <PrimaryButton onClick={handleBackToThirdParty} width="w-full">
              Back to {devLicenseAlias}
            </PrimaryButton>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SuccessfulPermissions;
