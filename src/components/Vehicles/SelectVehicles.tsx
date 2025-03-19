import React, { useEffect, useState } from "react";

import {
  SetVehiclePermissions,
  SetVehiclePermissionsBulk,
} from "@dimo-network/transactions";

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
import { getPermsValue } from "../../services/permissionsService";
import PrimaryButton from "../Shared/PrimaryButton";
import { backToThirdParty } from "../../utils/messageHandler";
import { UiStates, useUIManager } from "../../context/UIManagerContext";
import Loader from "../Shared/Loader";
import { EmptyState } from "./EmptyState";
import { ConnectCarButton } from "../Shared/ConnectCarButton";

interface SelectVehiclesProps {
  vehicleTokenIds: string[] | undefined; // Adjust the type based on your data
  permissionTemplateId: string; // Adjust the type if necessary
  vehicleMakes: string[] | undefined; // Adjust the type if necessary
  expirationDate: BigInt;
}

const SelectVehicles: React.FC<SelectVehiclesProps> = ({
  vehicleTokenIds,
  permissionTemplateId,
  vehicleMakes,
  expirationDate,
}) => {
  const { user, jwt } = useAuthContext();
  const { clientId, redirectUri, utm, devLicenseAlias } = useDevCredentials();
  const {
    setUiState,
    setComponentData,
    setLoadingState,
    componentData,
    error,
    setError,
  } = useUIManager();

  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  //Data from API's
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [incompatibleVehicles, setIncompatibleVehicles] = useState<Vehicle[]>(
    []
  );
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState("");
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [startCursor, setStartCursor] = useState("");

  //Data from Developer
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]); // Array for multiple selected vehicles)

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

      if (componentData && componentData.preSelectedVehicles) {
        const matchedVehicle = transformedVehicles.compatibleVehicles.find(
          (vehicle) =>
            vehicle.tokenId.toString() === componentData.preSelectedVehicles[0]
        );
        if (matchedVehicle) {
          handleVehicleSelect(matchedVehicle);
        }
      }
      // Set isExpanded based on vehicles length
    } catch (error) {
      setVehiclesLoading(false);
      setError("Could not fetch vehicles");
      console.error("Error fetching vehicles:", error);
    }
  };

  useEffect(() => {
    // Run both fetches in parallel
    Promise.all([fetchVehicles()]);
  }, []);

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
      const authPayloadWithVehicles = {
        ...authPayload,
        sharedVehicles: selectedVehicles.map(
          (vehicle: Vehicle) => vehicle.tokenId
        ),
      };
      sendAuthPayloadToParent(authPayloadWithVehicles, redirectUri, () =>
        handleNavigation(authPayloadWithVehicles)
      );
    }
  };

  const handleContinue = () => {
    sendJwtAfterPermissions((authPayload: any) => {
      backToThirdParty(authPayload, redirectUri, utm);
      setUiState(UiStates.TRANSACTION_CANCELLED);
    });
  };

  const handleShare = async () => {
    setLoadingState(true, "Sharing vehicles", true);

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
            setComponentData({ action: "shared", vehicles: selectedVehicles });
            setUiState(UiStates.VEHICLES_SHARED_SUCCESS);
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

  return (
    <div className="flex flex-col w-full items-center justify-center max-h-[480px] lg:max-h-[584px] box-border overflow-y-auto">
      {noVehicles && !vehiclesLoading && <EmptyState />}

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
        <div className="space-y-4 pt-4 max-h-[400px] overflow-auto w-full max-w-[440px]">
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

              <div>
                <ConnectCarButton />
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
        className={`grid grid-flow-col auto-cols-fr gap-4 ${
          canShare ? "justify-between" : "justify-center"
        } w-full max-w-[440px] pt-4`}
      >
        {(noVehicles || allShared) && (
          <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
        )}
        {canShare && (
          <>
            <button
              onClick={handleContinue}
              className="bg-white font-medium text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
            >
              Cancel
            </button>
            <PrimaryButton
              onClick={handleShare}
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
  );
};

export default SelectVehicles;
