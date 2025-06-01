import React from 'react';
import Header from '../Shared/Header';
import PrimaryButton from '../Shared/PrimaryButton';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { UiStates, useUIManager } from '../../context/UIManagerContext';
import { useAuthContext } from '../../context/AuthContext';
import { SetVehiclePermissions } from '@dimo-network/transactions';
import {
  generateIpfsSources,
  initializeIfNeeded,
  setVehiclePermissions,
} from '../../services/turnkeyService';
import { getPermsValue } from '../../services/permissionsService';
import { extendByYear, parseExpirationDate } from '../../utils/dateUtils';

export const ManageVehicle: React.FC = () => {
  const { clientId } = useDevCredentials();
  const { user } = useAuthContext();
  const {
    componentData: { vehicle, permissionTemplateId, permissions },
    setUiState,
    setComponentData,
    setLoadingState,
  } = useUIManager();

  const handlePermissionUpdate = async (
    actionType: 'revoke' | 'extend',
    expirationDate: string,
  ) => {
    const loadingMessage =
      actionType === 'revoke' ? 'Revoking vehicles' : 'Extending vehicles';
    const newAction = actionType === 'revoke' ? 'revoked' : 'extended';

    setLoadingState(true, loadingMessage, true);

    await initializeIfNeeded(user.subOrganizationId);

    const perms = getPermsValue(permissionTemplateId ?? '1', permissions);

    const expiration =
      actionType === 'revoke' ? BigInt(0) : parseExpirationDate(expirationDate);

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
    setUiState(UiStates.VEHICLES_SHARED_SUCCESS);
    setLoadingState(false);
  };

  const handleRevoke = async () => {
    const expirationDate = '0'; // Use current expiration for revoking
    await handlePermissionUpdate('revoke', expirationDate);
  };

  const handleExtend = async () => {
    const extendedExpirationDate = extendByYear(vehicle.expiresAt); // Extend expiration by 1 year
    await handlePermissionUpdate('extend', extendedExpirationDate);
  };

  return (
    <>
      <Header
        title={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
        subtitle={`ID:${vehicle.tokenId}`}
      />

      <img
        style={{ height: '80px', width: '80px' }}
        className="rounded-full object-cover mx-auto mt-8"
        src={
          'https://assets.dimo.xyz/ipfs/QmaaxazmGtNM6srcRmLyNdjCp8EAmvaTDYSo1k2CXVRTaY'
        }
        alt={`${vehicle.make} ${vehicle.model}`}
      />

      <p className="text-center mt-8">Shared until {vehicle.expiresAt}</p>

      {/* Render buttons */}
      <div className="flex mt-8 justify-center gap-2">
        <button
          onClick={handleRevoke}
          className="font-medium justify-center px-4 py-2 w-[214px] rounded-3xl border border-gray-300 bg-white text-black hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Stop Sharing
        </button>
        <PrimaryButton onClick={handleExtend} width="w-[214px]">
          Extend (1 year)
        </PrimaryButton>
      </div>
    </>
  );
};

export default ManageVehicle;
