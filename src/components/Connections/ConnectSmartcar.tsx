import { type FC } from "react";

import VehicleThumbnail from "../../assets/images/vehicle-thumbnail.png";
import PrimaryButton from "../Shared/PrimaryButton";
import { UiStates, useUIManager } from "../../context/UIManagerContext";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import { getAppUrl } from "../../utils/urlHelpers";
import { IOS_URL, SHOP_DIMO_URL } from "../../utils/constants";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import { constructAuthUrl } from "../../utils/authUrls";

export const ConnectSmartCar: FC = () => {
  const { componentData } = useUIManager(); // Access the manage function from the context
  const { devLicenseAlias, clientId, redirectUri } = useDevCredentials();
  const appUrl = getAppUrl();

  const handleConnect = () => {
    const urlParams = new URLSearchParams(window.location.search);

    const authUrl = constructAuthUrl({
      provider: "smartcar",
      clientId,
      redirectUri: "http://localhost:3000",
      entryState: UiStates.MINT_VEHICLE,
      expirationDate: urlParams.get("expirationDate"),
      permissionTemplateId: urlParams.get("permissionTemplateId"),
      utm: urlParams.getAll("utm"),
      vehicleMakes: urlParams.getAll("vehicleMakes"),
      vehicles: urlParams.getAll("vehicles"),
      make: componentData.makeModel, // Optional for Smartcar
      year: componentData.modelYear,
      countryCode: componentData.country, // Optional for Smartcar
    });

    window.location.href = authUrl;
  };

  return (
    <Card
      width="w-full max-w-[600px]"
      height="h-fit max-h-[770px]"
      className="flex flex-col gap-6 items-center text-center px-6"
    >
      {/* Header */}
      <Header
        title={`Connect Data Source for ${componentData.modelYear} ${componentData.makeModel}`}
        subtitle={appUrl.hostname}
      />

      {/* Text Wrapper - Restrict Width */}
      <div className="max-w-[480px] text-gray-600 text-sm text-center">
        At least one data source is required to connect to {devLicenseAlias}.
        Connecting through your car's app is the easiest option and will take
        less than a minute.
      </div>

      {/* Adapter Image */}
      <div className="flex justify-center pt-2">
        <img
          style={{ height: "120px", width: "120px" }}
          className="rounded-full object-cover"
          src={VehicleThumbnail}
          alt="DIMO Adapter"
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-col w-full max-w-[480px] px-4 space-y-3">
        <PrimaryButton onClick={handleConnect} width="w-full py-3">
          Connect with Smartcar
        </PrimaryButton>
      </div>
    </Card>
  );
};
