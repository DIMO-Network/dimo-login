import React, { useEffect, useState } from "react";
import { fetchVehiclesWithTransformation } from "../../services/identityService";
import VehicleCard from "./VehicleCard";
import { useAuthContext } from "../../context/AuthContext";
import { Vehicle } from "../../models/vehicle";
import {
  setVehiclePermissions,
  setVehiclePermissionsBulk,
} from "../../services/turnkeyService";
import { sacdPermissionValue } from "@dimo-network/transactions";
import { sendTokenToParent } from "../../utils/authUtils";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import {
  fetchPermissionsFromId,
  PermissionTemplate,
} from "../../services/permissionsService";
import { SACD_PERMISSIONS } from "@dimo-network/transactions/dist/core/types/args";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import PrimaryButton from "../Shared/PrimaryButton";
import VehicleThumbnail from "../../assets/images/vehicle-thumbnail.png";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import ErrorMessage from "../Shared/ErrorMessage";

const VehicleManager: React.FC = () => {
  // const targetGrantee = "0xeAa35540a94e3ebdf80448Ae7c9dE5F42CaB3481"; // TODO: Replace with client ID
  const { user, jwt, setAuthStep, error, setError, setLoading } = useAuthContext();
  const { clientId, redirectUri, permissionTemplateId, vehicleTokenIds } =
    useDevCredentials();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [permissionTemplate, setPermissionTemplate] =
    useState<PermissionTemplate | null>(null);
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]); // Array for multiple selected vehicles
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (user?.smartContractAddress && clientId) {
        try {
          const transformedVehicles = await fetchVehiclesWithTransformation(
            user.smartContractAddress,
            clientId,
            vehicleTokenIds
          );
          setVehicles(transformedVehicles);
        } catch (error) {
          console.error("Error fetching vehicles:", error);
        }
      }
    };

    const fetchPermissions = async () => {
      if (permissionTemplateId) {
        // Ensure permissionTemplateId is defined
        try {
          const permissionTemplate = await fetchPermissionsFromId(
            permissionTemplateId
          );
          setPermissionTemplate(permissionTemplate);
        } catch (error) {
          console.error("Error fetching permissions:", error);
        }
      }
    };

    // Run both fetches in parallel if they can be independent
    Promise.all([fetchVehicles(), fetchPermissions()]);
  }, [user?.smartContractAddress, clientId, permissionTemplateId]); // Added permissionTemplateId as a dependency

  useEffect(()=>{
    if (vehicles.length == 0 ) {
      //If there's no vehicles, show expanded by default
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  },[vehicles]);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicles(
      (prevSelected) =>
        prevSelected.includes(vehicle)
          ? prevSelected.filter((v) => v !== vehicle) // Deselect if already selected
          : [...prevSelected, vehicle] // Add to selected if not already selected
    );
  };

  const sendJwtAfterPermissions = () => {
    if (jwt && redirectUri) {
      sendTokenToParent(jwt, redirectUri, () => {
        setSelectedVehicles([]); // Clear selection after sharing
        setAuthStep(3); // Move to success page
      });
    }
  };

  const handleShare = async () => {
    setLoading("Sharing vehicles");
    const permissionsObject: SACD_PERMISSIONS = permissionTemplate?.data.scope
      .permissions
      ? permissionTemplate.data.scope.permissions.reduce(
          (obj: SACD_PERMISSIONS, permission: string) => {
            obj[permission as keyof SACD_PERMISSIONS] = true;
            return obj;
          },
          {} as SACD_PERMISSIONS
        )
      : {};

    console.log(permissionsObject);
    const perms = sacdPermissionValue(permissionsObject);

    if (selectedVehicles.length > 0 && clientId) {
      const unsharedTokenIds = selectedVehicles
        .filter((vehicle) => !vehicle.shared)
        .map((vehicle) => vehicle.tokenId);

      if (unsharedTokenIds.length === 0) {
        return;
      }

      try {
        if (unsharedTokenIds.length === 1) {
          await setVehiclePermissions(
            unsharedTokenIds[0],
            clientId as `0x${string}`,
            perms,
            BigInt(1793310371),
            "ipfs://QmRAuxeMnsjPsbwW8LkKtk6Nh6MoqTvyKwP3zwuwJnB2yP"
          );
        } else {
          await setVehiclePermissionsBulk(
            unsharedTokenIds,
            clientId as `0x${string}`,
            perms,
            BigInt(1793310371),
            "ipfs://QmRAuxeMnsjPsbwW8LkKtk6Nh6MoqTvyKwP3zwuwJnB2yP"
          );
        }

        sendJwtAfterPermissions();
        setLoading(false);
      } catch (error) {
        setError("Could not share vehicles");
        setLoading(false);
        console.error("Error sharing vehicles:", error);
      }
    } else {
      setError("No vehicles selected");
      setLoading(false);
    }
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
                      <p key={i} className="font-semibold mb-2">
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

  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[770px]">
      <Header title="Share Permissions" subtitle={""} />
      <div className="flex flex-col items-center justify-center max-h-[584px] box-border overflow-y-auto">
        {error && <ErrorMessage message={error} />}
        <div className="description w-[440px] text-sm mb-4 overflow-y-auto max-h-[356px]">
          {permissionTemplate?.data.description
            ? renderDescription(permissionTemplate?.data.description)
            : "The developer is requesting access to view your vehicle data. Select the vehicles you’d like to share access to."}
        </div>
        <div className="w-[440px]">
          <button
            className="bg-white w-[145px] text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500 flex items-center justify-between"
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
        <div className="space-y-4 pt-4 max-h-[400px] overflow-scroll w-[440px]">
          {vehicles && vehicles.length > 0 ? (
            vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.tokenId.toString()}
                vehicle={vehicle}
                isSelected={selectedVehicles.includes(vehicle)}
                onSelect={() => handleVehicleSelect(vehicle)}
                disabled={vehicle.shared}
              />
            ))
          ) : (
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
        </div>

        <div className="flex justify-between w-[440px] pt-4">
          <button
            onClick={sendJwtAfterPermissions}
            className="bg-white w-[214px] text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
          >
            Cancel
          </button>

          <PrimaryButton
            onClick={handleShare}
            width={"w-[214px]"}
            disabled={selectedVehicles.length === 0}
          >
            Share Vehicles
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
};

export default VehicleManager;
