import { useEffect, useState, type FC } from "react";

import PrimaryButton from "../Shared/PrimaryButton";
import { UiStates, useUIManager } from "../../context/UIManagerContext";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import { getAppUrl } from "../../utils/urlHelpers";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import { constructAuthUrl } from "../../utils/authUrls";
import {
  checkIntegrationInfo,
  createVehicleFromDeviceDefinitionId,
  registerIntegration,
  submitAuthCode,
} from "../../services/dimoDevicesService";
import { useAuthContext } from "../../context/AuthContext";
import { TESLA_INTEGRATION_ID } from "../../utils/constants";
import Loader from "../Shared/Loader";

export const ConnectTesla: FC = () => {
  const { componentData, setUiState, setLoadingState, setComponentData } =
    useUIManager(); // Access the manage function from the context
  const [step, setStep] = useState<
    "permissions" | "minting" | "virtual-key" | "polling-virtual-key" | "ready"
  >("permissions");
  const { devLicenseAlias, clientId, redirectUri } = useDevCredentials();
  const { jwt } = useAuthContext();
  const appUrl = getAppUrl();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get("code");
    const stateFromUrl = urlParams.get("state");

    if (!stateFromUrl) return;

    if (componentData && componentData.permissionsGranted) {
      setStep("virtual-key");
    }

    if (authCode && !(componentData && componentData.permissionsGranted)) {
      const state = JSON.parse(stateFromUrl);
      const vehicleToAdd = state.vehicleToAdd;
      handleAuthCode(authCode, vehicleToAdd);
    }
  }, []);

  // ✅ Main Tesla onboarding function
  const handleAuthCode = async (
    authCode: string,
    vehicleToAdd: {
      vin: any;
      make: any;
      model: any;
      year: any;
      deviceDefinitionId: any;
      country: any;
    }
  ) => {
    setLoadingState(true, "Checking Tesla permissions...");

    try {
      //Submit Auth Code, to get authorized vehicles
      const externalVehicles = await submitAuthCode(
        {
          authorizationCode: authCode,
          redirectUri: process.env.REACT_APP_TESLA_REDIRECT_URI as string,
        },
        jwt
      );

      if (!externalVehicles.success) {
        console.error("Permissions not granted");
        // setStep("permissions"); // Show permissions step again
        return;
      }

      const selectedVehicle = externalVehicles.data.vehicles.find((vehicle) => {
        if (!vehicleToAdd) return false;

        // Extract expected values from componentData
        const { vin, make, model, year, deviceDefinitionId } = vehicleToAdd;

        // Prioritize VIN if available
        if (vin && vehicle.vin === vin) {
          return true;
        }

        // Match against deviceDefinitionId if provided
        if (
          deviceDefinitionId &&
          vehicle.definition.id === deviceDefinitionId
        ) {
          return true;
        }

        // Match against make, model, year
        return (
          vehicle.definition.make.toLowerCase() === make.toLowerCase() &&
          vehicle.definition.model.toLowerCase() === model.toLowerCase() &&
          vehicle.definition.year === year
        );
      });

      //Here we're just getting the first vehicle, however we need to be more careful
      const deviceDefinitionId = selectedVehicle?.definition.id;
      const externalId = selectedVehicle?.externalId;

      if (!(deviceDefinitionId && externalId)) {
        console.error("Could not get vehicle");
        return;
      }

      // ✅ Step 2: Create Vehicle
      setLoadingState(true, "Creating vehicle...");
      const createdVehicle = await createVehicleFromDeviceDefinitionId(
        {
          countryCode: vehicleToAdd.country, //TODO: Update so not hardcoded
          deviceDefinitionId,
        },
        jwt
      );

      if (!createdVehicle.success) {
        console.error("Failed to create vehicle");
        return;
      }

      const userDeviceId = createdVehicle.data?.userDevice.id;

      setComponentData({
        ...componentData,
        permissionsGranted: true,
        userDeviceID: userDeviceId,
        integrationID: TESLA_INTEGRATION_ID,
      });

      if (!userDeviceId) {
        return;
      }

      // // ✅ Step 3: Register Integration
      setLoadingState(true, "Registering Tesla integration...");
      const registeredIntegration = await registerIntegration(
        {
          userDeviceId,
          integrationId: TESLA_INTEGRATION_ID,
          externalId,
        },
        jwt
      );

      if (!registeredIntegration.success) {
        console.error("Failed to register integration");
        return;
      }

      // // ✅ Step 4: Check Virtual Key Status
      setLoadingState(true, "Checking virtual key...");
      const integrationInfo = await checkIntegrationInfo(
        {
          userDeviceId,
          integrationId: TESLA_INTEGRATION_ID,
        },
        jwt
      );

      if (!integrationInfo.success) {
        return;
      }

      const virtualKeyStatus = integrationInfo.data.tesla?.virtualKeyStatus;

      if (
        virtualKeyStatus &&
        ["Paired", "Incapable"].includes(virtualKeyStatus)
      ) {
        setUiState(UiStates.MINT_VEHICLE);
      } else {
        setLoadingState(false);
      }
    } catch (error) {
      console.error("Error during onboarding:", error);
      setLoadingState(false);
      setStep("permissions");
    }
  };

  const pollVirtualKeyStatus = (
    userDeviceId: string,
    integrationId: string
  ) => {
    //Note: Not currently polling, relying on manual input - due to inability to test this, and to prevent race conditions
    const interval = setInterval(async () => {
      console.log("Polling Virtual Key Status...");
      const integrationInfo = await checkIntegrationInfo(
        {
          userDeviceId,
          integrationId,
        },
        jwt
      );

      if (!integrationInfo.success) {
        return;
      }

      const virtualKeyStatus = integrationInfo.data.tesla?.virtualKeyStatus;

      if (
        virtualKeyStatus &&
        ["Paired", "Incapable"].includes(virtualKeyStatus)
      ) {
        clearInterval(interval);
        setLoadingState(false);
        setUiState(UiStates.MINT_VEHICLE);
      }
    }, 5000); // Polling every 5 seconds
  };

  const handleNextStep = () => {
    if (step === "permissions") {
      // Redirect to Tesla OAuth
      //   window.location.href = `https://tesla.com/oauth/...`;
      // Temporarily redirect to this page, but with the auth code
      const urlParams = new URLSearchParams(window.location.search);
      const authUrl = constructAuthUrl({
        provider: "tesla",
        clientId,
        redirectUri,
        entryState: UiStates.CONNECT_TESLA,
        expirationDate: urlParams.get("expirationDate"),
        permissionTemplateId: urlParams.get("permissionTemplateId"),
        utm: urlParams.getAll("utm"),
        vehicleMakes: urlParams.getAll("vehicleMakes"),
        vehicles: urlParams.getAll("vehicles"),
        vehicleToAdd: componentData.vehicleToAdd,
      });

      // navigateToRedirectUri(authUrl);
      window.location.href = authUrl;
    } else if (step === "virtual-key") {
      // Open to Tesla's Virtual Key setup
      window.open(process.env.REACT_APP_TESLA_VIRTUAL_KEY_URL, "_blank");
      setStep("polling-virtual-key");
      // pollVirtualKeyStatus();
    } else if (step === "polling-virtual-key") {
      setLoadingState(false);
      setUiState(UiStates.MINT_VEHICLE);
    } else {
      // Virtual key setup complete, move to vehicle sharing
      setLoadingState(true, "Finalizing setup...");
      setTimeout(() => {
        setLoadingState(false);
        setUiState(UiStates.VEHICLE_MANAGER);
      }, 5000);
    }
  };

  return (
    <Card
      width="w-full max-w-[600px]"
      height="h-fit"
      className="flex flex-col items-center"
    >
      <div className="flex flex-col gap-6 w-[440px]">
        <Header
          title={
            step === "permissions"
              ? "Authorize your Tesla account"
              : step === "virtual-key"
              ? "Add Virtual Key"
              : step === "polling-virtual-key"
              ? "Waiting for Virtual Key"
              : "Setup Complete"
          }
          subtitle={appUrl.hostname}
          link={`${appUrl.protocol}//${appUrl.host}`}
        />

        {/* Render different components based on the step */}
        {(() => {
          switch (step) {
            case "permissions":
              return (
                <>
                  {/* Permissions Text */}
                  <div className="w-full text-gray-600 text-sm text-center">
                    {devLicenseAlias} requires access to your car’s data to
                    offer you charging incentives.
                  </div>

                  {/* Permissions List */}
                  <div className="flex flex-col gap-[10px] w-full">
                    {[
                      { name: "Vehicle information", type: "required" },
                      { name: "Vehicle location", type: "required" },
                      { name: "Profile", type: "recommended" },
                      { name: "Vehicle commands", type: "recommended" },
                      {
                        name: "Vehicle charging management",
                        type: "recommended",
                      },
                    ].map((permission) => (
                      <div
                        key={permission.name}
                        className="flex justify-between items-center p-4 border border-gray-200 rounded-2xl w-full"
                      >
                        <span className="text-black font-normal">
                          {permission.name}
                        </span>
                        <span
                          className={`px-3 py-1 text-sm font-normal rounded-full ${
                            permission.type === "required"
                              ? "bg-[#E80303] text-white"
                              : "bg-[#E4E4E7] text-[#3F3F46]"
                          }`}
                        >
                          {permission.type === "required"
                            ? "Required"
                            : "Recommended"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              );

            case "virtual-key":
              return (
                <>
                  {/* Virtual Key Step */}

                  <div className="w-full text-gray-600 text-sm">
                    {devLicenseAlias} requires access to your car’s data to
                    offer you charging incentives.
                  </div>

                  <div className="w-full text-gray-600 text-sm mt-2">
                    The virtual key provides end-to-end encryption, enables more
                    frequent data updates, and allows for remote commands from
                    your phone.
                  </div>

                  <div className="w-full text-gray-600 text-sm mt-2">
                    This can be removed at any time in your Tesla app.{" "}
                    <a
                      href="https://www.tesla.com/support"
                      className="text-black font-medium underline"
                    >
                      Learn more.
                    </a>
                  </div>
                </>
              );

            case "polling-virtual-key":
              return (
                <div className="py-10">
                  {/* Virtual Key Step */}
                  <Loader />
                </div>
              );

            case "minting":
              return (
                <>
                  <div className="w-full text-gray-600 text-sm text-center">
                    Your Tesla is now connected! You can now access vehicle data
                    and commands via {devLicenseAlias}.
                  </div>
                  <p className="text-lg font-medium text-black">All set! 🚀</p>
                </>
              );

            default:
              return null;
          }
        })()}

        {/* Buttons */}
        <div className="flex flex-col w-full space-y-3">
          <PrimaryButton onClick={handleNextStep} width="w-full py-3">
            {step === "permissions"
              ? "Continue"
              : step === "virtual-key"
              ? "Setup Virtual Key"
              : step === "polling-virtual-key"
              ? "I've added my Virtual Key!"
              : "Done"}
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
};
