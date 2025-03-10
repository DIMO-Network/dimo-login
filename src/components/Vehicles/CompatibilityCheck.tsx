import { useEffect, useState, type FC } from "react";
import PrimaryButton from "../Shared/PrimaryButton";
import { UiStates, useUIManager } from "../../context/UIManagerContext";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import { getAppUrl } from "../../utils/urlHelpers";
import Loader from "../Shared/Loader";
import { AuthProvider } from "../../utils/authUrls";
import {
  formatVehicleString,
  getDeviceDefinitionIdFromVin,
  searchDeviceDefinition,
} from "../../services/deviceDefinitionsService";
import { useAuthContext } from "../../context/AuthContext";

export const CompatibilityCheck: FC = () => {
  const { componentData, goBack, setUiState } = useUIManager(); // Access the manage function from the context
  const { jwt } = useAuthContext();
  const [isCompatible, setIsCompatible] = useState<boolean>(false); // `null` means loading
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [vehicleString, setVehicleString] = useState<string>("");
  const [connectionType, setConnectionType] = useState<AuthProvider>("connect");
  const appUrl = getAppUrl();

  const handleContinue = () => {
    if (connectionType == "tesla") {
      setUiState(UiStates.CONNECT_TESLA, { setBack: true });
    } else if (connectionType == "smartcar") {
      setUiState(UiStates.CONNECT_SMARTCAR, { setBack: true });
    } else {
      setUiState(UiStates.CONNECT_DEVICE, { setBack: true });
    }
  };

  const fetchDeviceDefinition = async () => {
    try {
      let result;

      if (componentData.vinNumber && componentData.country) {
        // Fetch using VIN if available
        result = await getDeviceDefinitionIdFromVin(
          {
            vin: componentData.vinNumber,
            countryCode: componentData.country, // Assuming ISO 3166-1 alpha-3 format
          },
          jwt
        );
      } else if (componentData.makeModel && componentData.modelYear) {
        // Fetch using Make/Model/Year if VIN is not available
        result = await searchDeviceDefinition({
          query: `${componentData.makeModel} ${componentData.modelYear}`,
          makeSlug: componentData.makeModel.split(" ")[0],
          modelSlug: componentData.makeModel.split(" ")[1],
          year: componentData.modelYear,
        });
      } else {
        console.error(
          "Missing required data: Provide either VIN & country or Make/Model/Year."
        );
        return updateCompatibilityState(false);
      }

      // Handle the API response
      processDeviceDefinitionResponse(result);
    } catch (error) {
      console.error("Unexpected error:", error);
      updateCompatibilityState(false);
    }
  };

  // Centralized state update function
  const updateCompatibilityState = (
    isCompatible: boolean,
    connectionType: "tesla" | "connect" | null = null
  ) => {
    setIsChecking(false);
    setIsCompatible(isCompatible);
    if (connectionType) {
      setConnectionType(connectionType);
    }
  };

  // Function to process API response and update state
  const processDeviceDefinitionResponse = (result: any) => {
    if (!result.success || !result.data) {
      return updateCompatibilityState(false);
    }

    const isTesla =
      "deviceDefinitionId" in result.data
        ? result.data.deviceDefinitionId.includes("tesla")
        : result.data.make === "Tesla";

    // Determine vehicle string, with fallback
    const vehicleString = (() => {
      try {
        return formatVehicleString(result.data.deviceDefinitionId);
      } catch {
        return formatVehicleString(
          `${result.data.year} ${result.data.make} ${result.data.model}`
        );
      }
    })();

    setVehicleString(vehicleString);
    updateCompatibilityState(true, isTesla ? "tesla" : "connect");
  };

  useEffect(() => {
    // setLoadingState(false);
    if (!componentData) {
      setIsCompatible(false);
      return;
    }
    console.log(componentData);
    fetchDeviceDefinition();
  }, [componentData]);

  return (
    <Card
      width="w-full max-w-[600px]"
      height="h-fit max-h-[770px]"
      className="flex flex-col gap-6 items-center"
    >
      <Header
        title={
          isChecking
            ? "Checking Compatibility..."
            : isCompatible
            ? `Your ${vehicleString} is Supported`
            : `Your ${vehicleString} is Not Supported`
        }
        subtitle={appUrl.hostname}
      />

      <div className="flex justify-center pt-2">
        <img
          style={{ height: "80px", width: "80px" }}
          className="rounded-full object-cover"
          src={
            "https://assets.dimo.xyz/ipfs/QmaaxazmGtNM6srcRmLyNdjCp8EAmvaTDYSo1k2CXVRTaY"
          }
        />
      </div>

      {isChecking ? (
        <div>
          <p className="text-gray-500">Checking compatibility...</p>
          <Loader />
        </div>
      ) : isCompatible ? (
        <div className="flex flex-col space-y-2 w-full px-4">
          <PrimaryButton onClick={handleContinue} width="w-full">
            Add this car
          </PrimaryButton>
          <button
            onClick={goBack}
            className="w-full bg-white font-medium text-black px-4 py-2 rounded-3xl hover:text-gray-500"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-col space-y-2 w-full px-4">
          <PrimaryButton onClick={goBack} width="w-full">
            Try another car
          </PrimaryButton>
          <button className="w-full bg-white font-medium text-black px-4 py-2 rounded-3xl hover:text-gray-500">
            Cancel
          </button>
        </div>
      )}
    </Card>
  );
};
