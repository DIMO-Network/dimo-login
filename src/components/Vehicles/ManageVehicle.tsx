import React from 'react';
import Header from '../Shared/Header';
import PrimaryButton from '../Shared/PrimaryButton';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { useAuthContext } from '../../context/AuthContext';
import { SetVehiclePermissions } from '@dimo-network/transactions';
import {
  generateIpfsSources,
  setVehiclePermissions,
} from '../../services/turnkeyService';
import { getPermsValue } from '../../services/permissionsService';
import { extendByYear, parseExpirationDate } from '../../utils/dateUtils';
import { Vehicle } from '../../models/vehicle';
import { INVALID_SESSION_ERROR, isInvalidSessionError } from '../../utils/authUtils';
import { captureException } from '@sentry/react';
import { ErrorMessage, UIManagerLoader } from '../Shared';

type VehiclePermissionsAction = 'revoke' | 'extend';

const useUpdateVehiclePermissions = () => {
  const { validateSession } = useAuthContext();
  const { clientId } = useDevCredentials();

  return async ({
    permissionTemplateId,
    expiration,
    vehicle,
  }: {
    permissionTemplateId: string;
    expiration: bigint;
    vehicle: Vehicle;
  }) => {
    const hasValidSession = await validateSession();
    if (!hasValidSession) {
      throw new Error(INVALID_SESSION_ERROR);
    }
    const perms = getPermsValue(permissionTemplateId ? permissionTemplateId : '1');
    const sources = await generateIpfsSources(perms, clientId, expiration);
    const basePermissions = {
      grantee: clientId as `0x${string}`,
      permissions: perms,
      expiration,
      source: sources,
    };

    const vehiclePermissions: SetVehiclePermissions = {
      ...basePermissions,
      tokenId: BigInt(vehicle.tokenId),
    };
    await setVehiclePermissions(vehiclePermissions);
  };
};
const getLoadingMessage = (actionType: VehiclePermissionsAction) => {
  return actionType === 'revoke' ? 'Revoking vehicles' : 'Extending vehicles';
};
const getNewExpirationDate = (vehicle: Vehicle, actionType: VehiclePermissionsAction) => {
  return actionType === 'revoke' ? BigInt(0) : extendExpirationDateByYear(vehicle);
};

const extendExpirationDateByYear = (vehicle: Vehicle) => {
  const extendedDate = extendByYear(vehicle.expiresAt);
  return parseExpirationDate(extendedDate);
};

export const ManageVehicle: React.FC = () => {
  const {
    componentData: { vehicle, permissionTemplateId },
    setUiState,
    setComponentData,
    setLoadingState,
    setError,
    isLoading,
    error,
  } = useUIManager();
  const updateVehiclePermissions = useUpdateVehiclePermissions();

  const handlePermissionUpdateSuccess = (actionType: VehiclePermissionsAction) => {
    const newAction = actionType === 'revoke' ? 'revoked' : 'extended';
    vehicle.shared = false;
    setComponentData({ action: newAction, vehicles: [vehicle] });
    setUiState(UiStates.VEHICLES_SHARED_SUCCESS);
  };

  const handlePermissionUpdate = async (actionType: VehiclePermissionsAction) => {
    try {
      setLoadingState(true, getLoadingMessage(actionType), true);
      setError(null);
      await updateVehiclePermissions({
        permissionTemplateId,
        expiration: getNewExpirationDate(vehicle, actionType),
        vehicle: vehicle,
      });
      handlePermissionUpdateSuccess(actionType);
    } catch (err) {
      captureException(err);
      if (!isInvalidSessionError(err)) {
        setError('Error updating vehicle permissions');
      }
    } finally {
      setLoadingState(false);
    }
  };

  const handleRevoke = () => {
    handlePermissionUpdate('revoke');
  };

  const handleExtend = async () => {
    handlePermissionUpdate('extend');
  };

  if (isLoading) {
    return <UIManagerLoader />;
  }

  return (
    <>
      <VehicleDetails vehicle={vehicle} />
      {!!error && <ErrorMessage message={error} />}
      <Footer onRevoke={handleRevoke} onExtend={handleExtend} />
    </>
  );
};

interface FooterProps {
  onRevoke: () => void;
  onExtend: () => void;
}

const VehicleDetails = ({ vehicle }: { vehicle: Vehicle }) => {
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
    </>
  );
};

const Footer = ({ onRevoke, onExtend }: FooterProps) => {
  return (
    <div className="flex mt-8 justify-center gap-2">
      <button
        onClick={onRevoke}
        className="font-medium justify-center px-4 py-2 w-[214px] rounded-3xl border border-gray-300 bg-white text-black hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        Stop Sharing
      </button>
      <PrimaryButton onClick={onExtend} width="w-[214px]">
        Extend (1 year)
      </PrimaryButton>
    </div>
  );
};

export default ManageVehicle;
