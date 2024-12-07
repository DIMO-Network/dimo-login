// src/components/SuccessPage.tsx
import React from "react";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import PrimaryButton from "../Shared/PrimaryButton";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import ErrorScreen from "../Shared/ErrorScreen";
import { isStandalone } from "../../utils/isStandalone";
import { useUIManager } from "../../context/UIManagerContext";
import { buildAuthPayload } from "../../utils/authUtils";
import { useAuthContext } from "../../context/AuthContext";
import { backToThirdParty } from "../../utils/messageHandler";
import { Vehicle } from "../../models/vehicle";
import VehicleCard from "./VehicleCard";
import { isEmbed } from "../../utils/isEmbed";

const SuccessfulPermissions: React.FC = () => {
  const { redirectUri, devLicenseAlias, clientId } = useDevCredentials();
  const { componentData: vehicles } = useUIManager();
  const { jwt, user } = useAuthContext();

  //   if (!componentData.transactionHash) {
  //     return (
  //       <ErrorScreen
  //         title="Invalid Navigation"
  //         message="Please check the configuration and reload the page."
  //       />
  //     );
  //   }

  const handleBackToThirdParty = () => {
    //If Dev is using popup mode, we simply exit the flow here and close the window
    //By this point the dev should already have the transaction data, so this screen is mainly for the users UX, for them to know what happened
    //Redirect mode however, the user controls when the data is sent because we need to perform a redirect
    const payload = buildAuthPayload(clientId!, jwt, user);
    backToThirdParty(payload, redirectUri!);
  };

  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[308px]">
      <Header
        title="You have successfully shared your vehicles!"
        subtitle={""}
      />
      <div className="space-y-4 max-h-[400px] overflow-scroll w-full max-w-[440px]">
        {vehicles &&
          vehicles.length > 0 &&
          vehicles.map((vehicle: Vehicle) => (
            <VehicleCard
              key={vehicle.tokenId.toString()}
              vehicle={vehicle}
              isSelected={false}
              onSelect={() => console.log("yee")}
              disabled={true}
            />
          ))}
      </div>
      <div className="space-y-4">
        {!isEmbed() && (
          <div className="flex justify-center">
            <PrimaryButton onClick={handleBackToThirdParty} width="w-64">
              Back to {devLicenseAlias}
            </PrimaryButton>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SuccessfulPermissions;
