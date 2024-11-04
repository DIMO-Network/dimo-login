import React, { useEffect, useState } from "react";
import { fetchVehiclesWithTransformation } from "../../services/identityService";
import VehicleCard from "./VehicleCard";
import { useAuthContext } from "../../context/AuthContext";
import { Vehicle } from "../../models/vehicle";
import { setVehiclePermissions } from "../../services/turnkeyService";
import { sacdPermissionValue } from "@dimo-network/transactions";
import { sendTokenToParent } from "../../utils/authUtils";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import {
  fetchPermissionsFromId,
  PermissionTemplate,
} from "../../services/permissionsService";
import { SACD_PERMISSIONS } from "@dimo-network/transactions/dist/core/types/args";

const VehicleManager: React.FC = () => {

  // const targetGrantee = "0xeAa35540a94e3ebdf80448Ae7c9dE5F42CaB3481"; // TODO: Replace with client ID
  const { user, jwt, setAuthStep } = useAuthContext();
  const { clientId, redirectUri, permissionTemplateId, vehicleTokenIds } = useDevCredentials();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [permissionTemplate, setPermissionTemplate] =
    useState<PermissionTemplate | null>(null);
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]); // Array for multiple selected vehicles

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

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicles(
      (prevSelected) =>
        prevSelected.includes(vehicle)
          ? prevSelected.filter((v) => v !== vehicle) // Deselect if already selected
          : [...prevSelected, vehicle] // Add to selected if not already selected
    );
  };

  const handleShare = async () => {
    if ( !jwt || !redirectUri ) {
        alert("Could not share vehicles, authentication failed");
        return;
    }
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
      try {
        for (const vehicle of selectedVehicles) {
          if (!vehicle.shared) {
            await setVehiclePermissions(
              vehicle.tokenId,
              clientId as `0x${string}`,
              perms,
              BigInt(1793310371),
              "ipfs://QmRAuxeMnsjPsbwW8LkKtk6Nh6MoqTvyKwP3zwuwJnB2yP"
            );
          }
        }

        sendTokenToParent(jwt, redirectUri, () => {
          //TODO: Better handling of null
          setSelectedVehicles([]); // Clear selection after sharing
          setAuthStep(3); // Move to success page
        });
      } catch (error) {
        console.error("Error sharing vehicles:", error);
      }
    } else {
      alert("Please select at least one non-shared vehicle to share.");
    }
  };

  const renderDescription = (description: string) => {
    return (
      <div>
        {description.split("\n\n").map((paragraph, index) => (
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
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-lg text-center">
      <h1 className="text-2xl font-semibold mb-2">
        Select Vehicles to Share with [App Name]
      </h1>
      <p style={{height:"40vh"}} className="text-sm text-gray-600 mb-6 overflow-scroll">
        {permissionTemplate?.data.description
          ? renderDescription(permissionTemplate?.data.description)
          : "The developer is requesting access to view your vehicle data. Select the vehicles you’d like to share access to."}
      </p>
      <div className="space-y-4">
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.tokenId.toString()}
            vehicle={vehicle}
            isSelected={selectedVehicles.includes(vehicle)}
            onSelect={() => handleVehicleSelect(vehicle)}
            disabled={vehicle.shared}
          />
        ))}
      </div>
      <button
        onClick={handleShare}
        disabled={selectedVehicles.length === 0}
        className="mt-6 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-400"
      >
        Share Selected
      </button>
    </div>
  );
};

export default VehicleManager;
