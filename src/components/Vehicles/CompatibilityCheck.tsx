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
} from "../../services/deviceDefinitionsService";
import { useAuthContext } from "../../context/AuthContext";
import {
  MakeModelYearEntry,
  makeModelYearMapping,
} from "../../utils/tablelandUtils";

export const CompatibilityCheck: FC = () => {
  const { componentData, goBack, setUiState, setComponentData } =
    useUIManager(); // Access the manage function from the context
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

  const fetchDeviceDefinition = async () => {
    try {
      const vin = componentData.vinNumber;
      const country = componentData.country;
      const makeModel = componentData.makeModel;
      const year = componentData.modelYear;

      let result;

      if (vin && country) {
        result = await getDeviceDefinitionIdFromVin(
          { vin, countryCode: country },
          jwt
        );
      } else if (makeModel && year) {
        const key = `${makeModel} ${year}`;
        const mapping = makeModelYearMapping[key];

        if (!mapping) {
          console.warn("Vehicle not supported in local mapping");
          setVehicleString(key);
          return updateCompatibilityState(false);
        }

        result = buildLocalMappingResponse(key, makeModel, year, mapping);
      } else {
        console.error("Missing required data.");
        return updateCompatibilityState(false);
      }

      processDeviceDefinitionResponse(result);
    } catch (error) {
      console.error("Unexpected error:", error);
      updateCompatibilityState(false);
    }
  };

  const buildLocalMappingResponse = (
    name: string,
    makeModel: string,
    year: number,
    mapping: MakeModelYearEntry
  ) => {
    const [make, ...modelParts] = makeModel.split(" ");
    return {
      success: true,
      data: {
        id: mapping.id,
        legacy_ksuid: mapping.ksuid,
        name,
        make,
        model: modelParts.join(" "),
        year,
        imageUrl: mapping.imageURI || undefined,
      },
    };
  };

  const processDeviceDefinitionResponse = (result: any) => {
    if (!result.success || !result.data) {
      return updateCompatibilityState(false);
    }

    const data = result.data;

    const isTesla =
      "deviceDefinitionId" in data
        ? data.deviceDefinitionId.includes("tesla")
        : data.make === "Tesla";

    const displayName = safeFormatVehicleString(data);
    setVehicleString(displayName);

    if (!componentData.vehicleToAdd) {
      setComponentData({
        vehicleToAdd: {
          make: data.make ?? componentData.makeModel.split(" ")[0],
          model:
            data.model ?? componentData.makeModel.split(" ").slice(1).join(" "),
          year: data.year ?? componentData.modelYear,
          deviceDefinitionId: data.id ?? (data as any).deviceDefinitionId,
          vin: componentData.vinNumber,
          country: componentData.country,
        },
      });
    }

    updateCompatibilityState(true, isTesla ? "tesla" : "connect");
  };

  const safeFormatVehicleString = (data: any): string => {
    try {
      return formatVehicleString(data.deviceDefinitionId);
    } catch {
      return formatVehicleString(`${data.year} ${data.make} ${data.model}`);
    }
  };

  useEffect(() => {
    // setLoadingState(false);
    if (!componentData) {
      setIsCompatible(false);
      return;
    }
    if (!componentData.vehicleToAdd) {
      //We've already fetched the device definition
      fetchDeviceDefinition();
    }
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
        link={`${appUrl.protocol}//${appUrl.host}`}
      />

      <div className="flex justify-center pt-5 py-5">
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
