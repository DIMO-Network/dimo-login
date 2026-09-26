// src/components/SuccessPage.tsx
import React from 'react';

import { Header, PrimaryButton } from '../Shared';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { buildAuthPayload } from '../../utils/authUtils';
import { useAuthContext } from '../../context/AuthContext';
import { backToThirdParty } from '../../utils/messageHandler';
import { Vehicle } from '../../models/vehicle';
import VehicleCard from './VehicleCard';
import { isEmbed } from '../../utils/isEmbed';
import { ShareResult } from '../../hooks/useShareVehicles';

// Vehicles whose update was skipped because their current grant couldn't be
// carried over. They're still shared exactly as before.
const SkippedUpdates = ({ skipped }: { skipped: ShareResult['skipped'] }) => (
  <section className="w-full max-w-[440px] rounded-2xl border border-gray-200 p-4 text-left">
    <h2 className="text-sm font-medium text-black">
      {skipped.length === 1
        ? '1 vehicle was not updated'
        : `${skipped.length} vehicles were not updated`}
    </h2>
    <ul className="mt-2 space-y-1 text-sm text-gray-600">
      {skipped.map(({ vehicle, reason }) => (
        <li key={vehicle.tokenId}>{reason}</li>
      ))}
    </ul>
    <p className="mt-2 text-sm text-gray-600">
      {skipped.length === 1 ? "It's" : "They're"} still shared as before. You can update{' '}
      {skipped.length === 1 ? 'it' : 'them'} later from the vehicle list.
    </p>
  </section>
);

export const SuccessfulPermissions: React.FC = () => {
  const { redirectUri, utm, devLicenseAlias, clientId, oemBrand } = useDevCredentials();
  const displayName = oemBrand?.name || devLicenseAlias;
  const { jwt, user } = useAuthContext();
  const {
    componentData: { vehicles, action, skipped = [] },
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
    <>
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
      {skipped.length > 0 && <SkippedUpdates skipped={skipped} />}
      <div className="flex fex-col">
        {!isEmbed() && (
          <div className="flex justify-center w-full">
            <PrimaryButton onClick={handleBackToThirdParty} width="sm:w-64 w-full">
              Back to {displayName}
            </PrimaryButton>
          </div>
        )}
      </div>
    </>
  );
};

export default SuccessfulPermissions;
