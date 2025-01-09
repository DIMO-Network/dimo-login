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
import { extendByYear, parseExpirationDate } from "../../utils/dateUtils";

const ManageVehicle: React.FC = () => {
  const { clientId } = useDevCredentials();
  const { user } = useAuthContext();
  const {
    componentData: { vehicle, permissionTemplateId },
    setUiState,
    setComponentData,
    setLoadingState,
  } = useUIManager();

  const handleCancel = () => {
    setUiState("SELECT_VEHICLES");
  };

  const handlePermissionUpdate = async (
    actionType: "revoke" | "extend",
    expirationDate: string
  ) => {
    const loadingMessage =
      actionType === "revoke" ? "Revoking vehicles" : "Extending vehicles";
    const newAction = actionType === "revoke" ? "revoked" : "extended";

    setLoadingState(true, loadingMessage);

    await initializeIfNeeded(user.subOrganizationId);

    const perms = getPermsValue(
      permissionTemplateId ? permissionTemplateId : "1"
    );

    const expiration = actionType == "revoke" ? BigInt(0) : parseExpirationDate(expirationDate);

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
    setComponentData({ action: newAction, vehicles: [vehicle] });
    setUiState("VEHICLES_SHARED_SUCCESS");
    setLoadingState(false);
  };

  const handleRevoke = async () => {
    const expirationDate = "0"; // Use current expiration for revoking
    await handlePermissionUpdate("revoke", expirationDate);
  };

  const handleExtend = async () => {
    const extendedExpirationDate = extendByYear(vehicle.expiresAt); // Extend expiration by 1 year
    await handlePermissionUpdate("extend", extendedExpirationDate);
  };

  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[400px]">
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
      <div className="flex pt-8 justify-center gap-2">
        <button
          onClick={handleCancel}
          className="bg-white font-medium w-[214px] text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
        >
          Cancel
        </button>
        <PrimaryButton onClick={handleRevoke} width="w-[214px]">
          Stop Sharing
        </PrimaryButton>
        <PrimaryButton onClick={handleExtend} width="w-[214px]">
          Extend (1 year)
        </PrimaryButton>
      </div>
    </Card>
  );
};

export default ManageVehicle;
function setLoadingState(arg0: boolean, arg1: string) {
  throw new Error("Function not implemented.");
}
