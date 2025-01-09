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
      [action === "revoked" ? "revokedVehicles" : "sharedVehicles"]:
        vehicleTokenIds,
    };
    backToThirdParty(payload, redirectUri);

    //Shared vehicles to be fetched through urlParams.getAll("sharedVehicles")
  };

  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[308px]">
      <Header
        title={`You have successfully ${action} your vehicles!`}
        subtitle={""}
      />
      <div className="space-y-4 pt-4 max-h-[400px] overflow-scroll w-full max-w-[440px]">
        {vehicles &&
          vehicles.length > 0 &&
          vehicles.map((vehicle: Vehicle) => (
            <VehicleCard
              key={vehicle.tokenId.toString()}
              vehicle={vehicle}
              isSelected={false}
              onSelect={() => console.log("yee")}
              disabled={true}
              incompatible={false}
            />
          ))}
      </div>
      <div className="space-y-4 pt-4">
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
