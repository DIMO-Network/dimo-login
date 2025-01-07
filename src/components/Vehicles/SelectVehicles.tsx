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
import {
  SetVehiclePermissions,
  SetVehiclePermissionsBulk,
} from "@dimo-network/transactions";
import { FetchPermissionsParams } from "../../models/permissions";
import Loader from "../Shared/Loader";
import SecondaryButton from "../Shared/SecondaryButton";

const SelectVehicles: React.FC = () => {
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

  //Data from API's
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [incompatibleVehicles, setIncompatibleVehicles] = useState<Vehicle[]>(
    []
  );
  const [permissionTemplate, setPermissionTemplate] =
    useState<SACDTemplate | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState("");
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [startCursor, setStartCursor] = useState("");

  //Data from Developer
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]); // Array for multiple selected vehicles
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
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  };

  const fetchVehicles = async (direction = "next") => {
    try {
      const cursor = direction === "next" ? endCursor : startCursor;

      const transformedVehicles = await fetchVehiclesWithTransformation(
        user.smartContractAddress,
        clientId,
        cursor,
        direction,
        vehicleTokenIds,
        vehicleMakes
      );

      setVehiclesLoading(false);
      setVehicles(transformedVehicles.compatibleVehicles);
      setIncompatibleVehicles(transformedVehicles.incompatibleVehicles);
      setEndCursor(transformedVehicles.endCursor);
      setStartCursor(transformedVehicles.startCursor);
      setHasPreviousPage(transformedVehicles.hasPreviousPage);
      setHasNextPage(transformedVehicles.hasNextPage);
      setError(null);
      // Set isExpanded based on vehicles length
    } catch (error) {
      setError("Could not fetch vehicles");
      console.error("Error fetching vehicles:", error);
    }
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
    // Run both fetches in parallel
    Promise.all([fetchVehicles(), fetchPermissions()]);
  }, [
    user.smartContractAddress,
    clientId,
    permissionTemplateId,
    devLicenseAlias,
  ]);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicles(
      (prevSelected) =>
        prevSelected.includes(vehicle)
          ? prevSelected.filter((v) => v !== vehicle) // Deselect if already selected
          : [...prevSelected, vehicle] // Add to selected if not already selected
    );
  };

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

  const handleContinue = () => {
    sendJwtAfterPermissions((authPayload: any) => {
      backToThirdParty(authPayload, redirectUri);
      setUiState("TRANSACTION_CANCELLED");
    });
  };

  const handleShare = async () => {
    setLoadingState(true, "Sharing vehicles");

    await initializeIfNeeded(user.subOrganizationId);

    if (permissionTemplateId) {
      const perms = getPermsValue(permissionTemplateId);
      if (selectedVehicles.length > 0 && clientId) {
        const unsharedTokenIds = selectedVehicles
          .filter((vehicle) => !vehicle.shared)
          .map((vehicle) => vehicle.tokenId);

        if (unsharedTokenIds.length === 0) {
          return;
        }

        try {
          const sources = await generateIpfsSources(
            perms,
            clientId,
            expirationDate
          );

          const basePermissions = {
            grantee: clientId as `0x${string}`,
            permissions: perms,
            expiration: expirationDate,
            source: sources,
          };

          if (unsharedTokenIds.length === 1) {
            const vehiclePermissions: SetVehiclePermissions = {
              ...basePermissions,
              tokenId: unsharedTokenIds[0],
            };

            await setVehiclePermissions(vehiclePermissions);
          } else {
            const bulkVehiclePermissions: SetVehiclePermissionsBulk = {
              ...basePermissions,
              tokenIds: unsharedTokenIds,
            };
            await setVehiclePermissionsBulk(bulkVehiclePermissions);
          }

          sendJwtAfterPermissions((authPayload: any) => {
            setComponentData(selectedVehicles);
            setUiState("VEHICLES_SHARED_SUCCESS");
            setSelectedVehicles([]);
          });
          setLoadingState(false);
        } catch (error) {
          setError("Could not share vehicles");
          setLoadingState(false);
          console.error("Error sharing vehicles:", error);
        }
      } else {
        setError("No vehicles selected");
        setLoadingState(false);
      }
    }
  };

  const handleToggleSelectAll = () => {
    const nonSharedVehicles = vehicles.filter((vehicle) => !vehicle.shared);

    // Check if all non-shared vehicles are already selected
    const allSelected = nonSharedVehicles.every((vehicle) =>
      selectedVehicles.includes(vehicle)
    );

    // Toggle selection
    setSelectedVehicles(allSelected ? [] : nonSharedVehicles);
  };

  const noVehicles = vehicles.length === 0 && incompatibleVehicles.length === 0;
  const allShared = vehicles.length > 0 && vehicles.every((v) => v.shared);
  const canShare = vehicles.some((v) => !v.shared);
  const appUrl = new URL(
    document.referrer ? document.referrer : "https://dimo.org"
  );

  return (
    <Card width="w-full max-w-[600px]" height="h-fit max-h-[770px]">
      <Header
        title="Select Vehicles to Share"
        subtitle={appUrl.hostname}
        link={`${appUrl.protocol}//${appUrl.host}`}
      />
      <div className="flex flex-col items-center justify-center max-h-[480px] lg:max-h-[584px] box-border overflow-y-auto">
        {error && <ErrorMessage message={error} />}

        {noVehicles && !vehiclesLoading && (
          <div className="flex flex-col items-center">
            <img
              style={{ height: "40px", width: "40px" }}
              className="rounded-full object-cover mr-4"
              src={VehicleThumbnail}
            />
            <h2 className="text-gray-500 text-xl font-medium pt-2">
              No cars connected yet
            </h2>
            <p className="text-sm">
              Connect your car in the DIMO app to share permissions.
            </p>
          </div>
        )}

        {allShared && (
          <div className="flex flex-col items-center">
            <h2 className="text-gray-500 text-xl font-medium pt-2">
              All vehicles have been shared
            </h2>
            <p className="text-sm">
              You have already shared all your vehicles with {devLicenseAlias}.
            </p>
          </div>
        )}

        {vehiclesLoading ? (
          <Loader />
        ) : (
          <div className="space-y-4 pt-4 max-h-[400px] overflow-scroll w-full max-w-[440px]">
            {/* Render Compatible Vehicles */}
            {vehicles && vehicles.length > 0 && (
              <>
                <div className="flex justify-between">
                  <h2 className="text-lg">Compatible</h2>
                  <button
                    onClick={handleToggleSelectAll}
                    className="bg-white text-xs w-[75px] text-[#09090B] border border-gray-300 pr-px pl-px py-1 rounded-full hover:border-gray-500"
                  >
                    {vehicles
                      .filter((vehicle) => !vehicle.shared)
                      .every((vehicle) => selectedVehicles.includes(vehicle))
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
                {vehicles.map((vehicle: Vehicle) => (
                  <VehicleCard
                    key={vehicle.tokenId.toString()}
                    vehicle={vehicle}
                    isSelected={selectedVehicles.includes(vehicle)}
                    onSelect={() => handleVehicleSelect(vehicle)}
                    disabled={false}
                    incompatible={false}
                  />
                ))}
              </>
            )}

            {/* Render Incompatible Vehicles */}
            {incompatibleVehicles && incompatibleVehicles.length > 0 && (
              <>
                <h2 className="text-lg">Incompatible</h2>
                {incompatibleVehicles.map((vehicle: Vehicle) => (
                  <VehicleCard
                    key={vehicle.tokenId.toString()}
                    vehicle={vehicle}
                    isSelected={selectedVehicles.includes(vehicle)} //Wont execute since disabled
                    onSelect={() => handleVehicleSelect(vehicle)} //Wont execute since disabled
                    disabled={false}
                    incompatible={true}
                  />
                ))}
              </>
            )}

            {/* Pagination Buttons */}
            {(hasNextPage || hasPreviousPage) && (
              <div className="flex justify-center space-x-4 mt-4">
                {hasPreviousPage && (
                  <PrimaryButton
                    onClick={() => {
                      setVehiclesLoading(true);
                      fetchVehicles("previous");
                    }}
                    width="w-[214px]"
                  >
                    Back
                  </PrimaryButton>
                )}
                {hasNextPage && (
                  <PrimaryButton
                    onClick={() => {
                      setVehiclesLoading(true);
                      fetchVehicles();
                    }}
                    width="w-[214px]"
                  >
                    Next
                  </PrimaryButton>
                )}
              </div>
            )}
          </div>
        )}

        {/* Render buttons */}
        <div
          className={`flex ${
            canShare ? "justify-between" : "justify-center"
          } w-full max-w-[440px] pt-4`}
        >
          {(noVehicles || allShared) && (
            <PrimaryButton onClick={handleContinue} width="w-[214px]">
              Continue
            </PrimaryButton>
          )}
          {canShare && (
            <>
              <button
                onClick={handleContinue}
                className="bg-white font-medium w-[214px] text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={handleShare}
                width="w-[214px]"
                disabled={selectedVehicles.length === 0}
              >
                {selectedVehicles.length === 0
                  ? "Share selected cars"
                  : selectedVehicles.length === 1
                  ? "Share 1 car selected"
                  : `Share ${selectedVehicles.length} cars selected`}
              </PrimaryButton>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SelectVehicles;
