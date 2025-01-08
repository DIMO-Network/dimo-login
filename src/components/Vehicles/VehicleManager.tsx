import React, { useEffect, useState } from "react";
import { fetchVehiclesWithTransformation } from "../../services/identityService";
import VehicleCard from "./VehicleCard";
import { useAuthContext } from "../../context/AuthContext";
import { Vehicle } from "../../models/vehicle";
import {
  generateIpfsSources,
  initializeIfNeeded,
  setVehiclePermissions,
  setVehiclePermissionsBulk,
} from "../../services/turnkeyService";
import {
  buildAuthPayload,
  sendAuthPayloadToParent,
} from "../../utils/authUtils";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import {
  fetchPermissionsFromId,
  getPermsValue,
} from "../../services/permissionsService";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import PrimaryButton from "../Shared/PrimaryButton";
import VehicleThumbnail from "../../assets/images/vehicle-thumbnail.png";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import ErrorMessage from "../Shared/ErrorMessage";
import {
  backToThirdParty,
  sendMessageToReferrer,
} from "../../utils/messageHandler";
import { isStandalone } from "../../utils/isStandalone";
import { useUIManager } from "../../context/UIManagerContext";
import { SACDTemplate } from "@dimo-network/transactions/dist/core/types/dimo";
import {
  getDefaultExpirationDate,
  parseExpirationDate,
} from "../../utils/dateUtils";
import { FetchPermissionsParams } from "../../models/permissions";
import SecondaryButton from "../Shared/SecondaryButton";

const VehicleManager: React.FC = () => {
  const { user, jwt } = useAuthContext();
  const { clientId, redirectUri, devLicenseAlias } = useDevCredentials();
  const { setUiState, setComponentData, setLoadingState, error, setError } =
    useUIManager();

  //Data from SDK
  const [permissionTemplateId, setPermissionTemplateId] = useState<
    string | undefined
  >();
  const [vehicleTokenIds, setVehicleTokenIds] = useState<
    string[] | undefined
  >();
  const [vehicleMakes, setVehicleMakes] = useState<string[] | undefined>();
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  const [permissionTemplate, setPermissionTemplate] =
    useState<SACDTemplate | null>(null);

  const [isExpanded, setIsExpanded] = useState<boolean | undefined>(false);
  const [expirationDate, setExpirationDate] = useState<BigInt>(
    getDefaultExpirationDate()
  );

  const handleStandaloneMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const permissionTemplateIdFromUrl = urlParams.get("permissionTemplateId");
    const expirationDateFromUrl = urlParams.get("expirationDate");
    const vehiclesFromUrl = urlParams.getAll("vehicles");
    const vehicleMakesFromUrl = urlParams.getAll("vehicleMakes");

    if (permissionTemplateIdFromUrl) {
      setPermissionTemplateId(permissionTemplateIdFromUrl);
      if (vehiclesFromUrl.length) setVehicleTokenIds(vehiclesFromUrl);
      if (vehicleMakesFromUrl.length) setVehicleMakes(vehicleMakesFromUrl);
      if (expirationDateFromUrl)
        setExpirationDate(parseExpirationDate(expirationDateFromUrl));
    }
  };

  const handleEmbedPopupMode = () => {
    sendMessageToReferrer({ eventType: "SHARE_VEHICLES_DATA" });

    const handleMessage = (event: MessageEvent) => {
      const {
        eventType,
        permissionTemplateId: permissionTemplateIdFromMessage,
        vehicles: vehiclesFromMessage,
        vehicleMakes: vehicleMakesFromMessage,
        expirationDate: expirationDateFromMessage,
      } = event.data;

      if (eventType === "SHARE_VEHICLES_DATA") {
        if (permissionTemplateIdFromMessage)
          setPermissionTemplateId(permissionTemplateIdFromMessage);
        if (vehiclesFromMessage) setVehicleTokenIds(vehiclesFromMessage);
        if (vehicleMakesFromMessage) setVehicleMakes(vehicleMakesFromMessage);
        if (expirationDateFromMessage)
          setExpirationDate(parseExpirationDate(expirationDateFromMessage));

        setIsExpanded(!(vehicleMakes && vehicleTokenIds));
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  };

  const fetchPermissions = async () => {
    if (permissionTemplateId) {
      try {
        const permissionsParams: FetchPermissionsParams = {
          permissionTemplateId,
          clientId,
          devLicenseAlias,
          expirationDate,
          walletAddress: user.smartContractAddress,
          email: user.email,
        };
        const permissionTemplate = await fetchPermissionsFromId(
          permissionsParams
        );
        setPermissionTemplate(permissionTemplate as SACDTemplate);
      } catch (error) {
        setError("Could not fetch permissions");
        console.error("Error fetching permissions:", error);
      }
    }
  };

  useEffect(() => {
    if (isStandalone()) {
      handleStandaloneMode();
    } else {
      handleEmbedPopupMode();
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPermissions()]);
  }, [
    user.smartContractAddress,
    clientId,
    permissionTemplateId,
    devLicenseAlias,
  ]);

  const sendJwtAfterPermissions = (
    handleNavigation: (authPayload: any) => void
  ) => {
    if (jwt && redirectUri && clientId) {
      const authPayload = buildAuthPayload(clientId, jwt, user);
      sendAuthPayloadToParent(authPayload, redirectUri, () =>
        handleNavigation(authPayload)
      );
    }
  };

  const handleCancel = () => {
    sendJwtAfterPermissions((authPayload: any) => {
      backToThirdParty(authPayload, redirectUri);
      setUiState("TRANSACTION_CANCELLED");
    });
  };

  const handleContinue = () => {
    setUiState("SELECT_VEHICLES");
  };

  const renderDescription = (description: string) => {
    const paragraphs = description.split("\n\n");

    // Show only the first paragraph by default, and the rest will be shown when expanded
    const firstParagraph = paragraphs[0];
    const restOfDescription = paragraphs.slice(1).join("\n\n");

    return (
      <div>
        {/* Render the first paragraph or the entire description based on the `isExpanded` state */}
        {isExpanded ? (
          description.split("\n\n").map((paragraph, index) => (
            <React.Fragment key={index}>
              {/* Check if the paragraph contains bullet points */}
              {paragraph.includes("- ") ? (
                <ul className="list-disc list-inside mb-4">
                  {paragraph.split("\n-").map((line, i) =>
                    i === 0 ? (
                      <p key={i} className="mb-2">
                        {line.trim()}
                      </p>
                    ) : (
                      <li key={i} className="ml-4">
                        {line.trim()}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="mb-4">{paragraph}</p>
              )}
            </React.Fragment>
          ))
        ) : (
          <p className="mb-4">{firstParagraph}</p> // Show only the first paragraph
        )}
      </div>
    );
  };

  const appUrl = new URL(
    document.referrer ? document.referrer : "https://dimo.org"
  );

  return (
    <Card width="w-full max-w-[600px]" height="h-fit max-h-[770px]">
      <Header
        title={`${devLicenseAlias} wants to use DIMO to connect to your vehicles data`}
        subtitle={appUrl.hostname}
        link={`${appUrl.protocol}//${appUrl.host}`}
      />
      <div className="flex flex-col items-center justify-center max-h-[480px] lg:max-h-[584px] box-border overflow-y-auto">
        {error && <ErrorMessage message={error} />}

        {vehicleMakes && (
          <div
            className={`flex w-fit w-[440px] mt-2 items-center p-4 rounded-2xl cursor-pointer transition bg-gray-100 text-gray-500 cursor-not-allowed`}
          >
            <label
              htmlFor={`vehicle-makes`}
              className="flex-grow text-left hover:cursor-pointer"
            >
              <div className="flex text-black gap-2">
                <svg
                  width="16"
                  height="24"
                  viewBox="0 0 16 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13.7667 1.67467C13.6 1.18301 13.1333 0.833008 12.5833 0.833008H3.41667C2.86667 0.833008 2.40833 1.18301 2.23333 1.67467L0.5 6.66634V13.333C0.5 13.7913 0.875 14.1663 1.33333 14.1663H2.16667C2.625 14.1663 3 13.7913 3 13.333V12.4997H13V13.333C13 13.7913 13.375 14.1663 13.8333 14.1663H14.6667C15.125 14.1663 15.5 13.7913 15.5 13.333V6.66634L13.7667 1.67467ZM3.70833 2.49967H12.2833L13.1833 5.09134H2.80833L3.70833 2.49967ZM13.8333 10.833H2.16667V6.66634H13.8333V10.833Z"
                    fill="#080808"
                  />
                  <path
                    d="M4.25 9.99967C4.94036 9.99967 5.5 9.44003 5.5 8.74967C5.5 8.05932 4.94036 7.49967 4.25 7.49967C3.55964 7.49967 3 8.05932 3 8.74967C3 9.44003 3.55964 9.99967 4.25 9.99967Z"
                    fill="#080808"
                  />
                  <path
                    d="M11.75 9.99967C12.4404 9.99967 13 9.44003 13 8.74967C13 8.05932 12.4404 7.49967 11.75 7.49967C11.0596 7.49967 10.5 8.05932 10.5 8.74967C10.5 9.44003 11.0596 9.99967 11.75 9.99967Z"
                    fill="#080808"
                  />
                </svg>
                Vehicle Makes
              </div>
              <div className="text-sm text-gray-500">
                {vehicleMakes.join(", ")}
              </div>
            </label>
          </div>
        )}

        {vehicleTokenIds && (
          <div
            className={`flex w-fit w-[440px] mt-2 p-4 items-center rounded-2xl cursor-pointer transition bg-gray-100 text-gray-500 cursor-not-allowed`}
          >
            <label
              htmlFor={`vehicle-ids`}
              className="flex-grow text-left hover:cursor-pointer"
            >
              <div className="flex text-black gap-2">
                <svg
                  width="16"
                  height="24"
                  viewBox="0 0 16 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13.7667 1.67467C13.6 1.18301 13.1333 0.833008 12.5833 0.833008H3.41667C2.86667 0.833008 2.40833 1.18301 2.23333 1.67467L0.5 6.66634V13.333C0.5 13.7913 0.875 14.1663 1.33333 14.1663H2.16667C2.625 14.1663 3 13.7913 3 13.333V12.4997H13V13.333C13 13.7913 13.375 14.1663 13.8333 14.1663H14.6667C15.125 14.1663 15.5 13.7913 15.5 13.333V6.66634L13.7667 1.67467ZM3.70833 2.49967H12.2833L13.1833 5.09134H2.80833L3.70833 2.49967ZM13.8333 10.833H2.16667V6.66634H13.8333V10.833Z"
                    fill="#080808"
                  />
                  <path
                    d="M4.25 9.99967C4.94036 9.99967 5.5 9.44003 5.5 8.74967C5.5 8.05932 4.94036 7.49967 4.25 7.49967C3.55964 7.49967 3 8.05932 3 8.74967C3 9.44003 3.55964 9.99967 4.25 9.99967Z"
                    fill="#080808"
                  />
                  <path
                    d="M11.75 9.99967C12.4404 9.99967 13 9.44003 13 8.74967C13 8.05932 12.4404 7.49967 11.75 7.49967C11.0596 7.49967 10.5 8.05932 10.5 8.74967C10.5 9.44003 11.0596 9.99967 11.75 9.99967Z"
                    fill="#080808"
                  />
                </svg>
                Vehicle Token IDs
              </div>
              <div className="text-sm text-gray-500">
                {vehicleTokenIds
                  .sort((a, b) => Number(a) - Number(b))
                  .join(", ")}
              </div>
            </label>
          </div>
        )}

        <>
          <div className="description w-fit max-w-[440px] mt-2 text-sm mb-4 overflow-y-auto max-h-[356px]">
            {permissionTemplate?.data.description
              ? renderDescription(permissionTemplate?.data.description)
              : "The developer is requesting access to view your vehicle data. Select the vehicles you’d like to share access to."}
          </div>
          <div className="w-full max-w-[440px]">
            <button
              className="bg-white w-[145px] text-[#09090B] font-medium border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500 flex items-center justify-between"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span>{isExpanded ? "Show less" : "Show more"}</span>
              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 ml-2" />
              )}
            </button>
          </div>
        </>

        {/* Render buttons */}
        <div className="flex flex-col pt-4 gap-2">
          <PrimaryButton onClick={handleContinue} width="w-[214px]">
            Select Vehicles
          </PrimaryButton>
          <SecondaryButton onClick={handleCancel} width="w-[214px]">
            Cancel
          </SecondaryButton>
        </div>
      </div>
    </Card>
  );
};

export default VehicleManager;
