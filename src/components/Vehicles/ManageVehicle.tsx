// src/components/SuccessPage.tsx
import React, { useEffect } from "react";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import PrimaryButton from "../Shared/PrimaryButton";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import { useUIManager } from "../../context/UIManagerContext";
import { useAuthContext } from "../../context/AuthContext";
import { SetVehiclePermissions } from "@dimo-network/transactions";
import {
  generateIpfsSources,
  initializeIfNeeded,
  setVehiclePermissions,
} from "../../services/turnkeyService";
import { getPermsValue } from "../../services/permissionsService";

const ManageVehicle: React.FC = () => {
  const { clientId } = useDevCredentials();
  const { user } = useAuthContext();
  const {
    componentData: {vehicle, permissionTemplateId},
    setUiState,
    setComponentData,
    setLoadingState,
  } = useUIManager();

  const handleCancel = () => {
    setUiState("SELECT_VEHICLES");
  };

  const handleContinue = async () => {
    //Revokes Permissions
    setLoadingState(true, "Revoking vehicles");

    await initializeIfNeeded(user.subOrganizationId);

    const perms = getPermsValue(permissionTemplateId ? permissionTemplateId : "1");

    const expiration = BigInt(0);

    const sources = await generateIpfsSources(perms, clientId, expiration);

    const basePermissions = {
      grantee: clientId as `0x${string}`,
      permissions: perms,
      expiration,
      source: sources,
    };

    const vehiclePermissions: SetVehiclePermissions = {
      ...basePermissions,
      tokenId: vehicle.tokenId,
    };

    await setVehiclePermissions(vehiclePermissions);
    vehicle.shared = false;
    setComponentData({ action: "revoked", vehicles: [vehicle] });
    setUiState("VEHICLES_SHARED_SUCCESS");
    setLoadingState(false);
  };

  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[308px]">
      <Header
        title={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
        subtitle={`ID:${vehicle.tokenId}`}
      />

      <div className="flex justify-center pt-8">
        <img
          style={{ height: "80px", width: "80px" }}
          className="rounded-full object-cover"
          src={
            "https://assets.dimo.xyz/ipfs/QmaaxazmGtNM6srcRmLyNdjCp8EAmvaTDYSo1k2CXVRTaY"
          }
          alt={`${vehicle.make} ${vehicle.model}`}
        />
      </div>

      <div className="flex pt-8 justify-center">
        <p>Shared until {vehicle.expiresAt}</p>
      </div>

      {/* Render buttons */}
      <div className="flex pt-8 gap-2">
        <button
          onClick={handleCancel}
          className="bg-white font-medium w-[214px] text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
        >
          Cancel
        </button>
        <PrimaryButton onClick={handleContinue} width="w-[214px]">
          Stop Sharing
        </PrimaryButton>
      </div>
    </Card>
  );
};

export default ManageVehicle;
function setLoadingState(arg0: boolean, arg1: string) {
  throw new Error("Function not implemented.");
}
