import React from 'react';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { isInvalidSessionError } from '../../utils/authUtils';
import { captureException } from '@sentry/react';
import { ErrorMessage, UIManagerLoader } from '../Shared';
import { useUpdateVehiclePermissions } from '../../hooks';
import { VehiclePermissionsAction } from '../../types';
import { getNewExpirationDate } from '../../utils/vehicles';
import { ManageVehicleDetails } from './ManageVehicleDetails';
import { ManageVehicleFooter } from './ManageVehicleFooter';

const getLoadingMessage = (actionType: VehiclePermissionsAction) => {
  return actionType === 'revoke' ? 'Revoking vehicles' : 'Extending vehicles';
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

  const handleSuccess = (actionType: VehiclePermissionsAction) => {
    const newAction = actionType === 'revoke' ? 'revoked' : 'extended';
    vehicle.shared = false;
    setComponentData({ action: newAction, vehicles: [vehicle] });
    setUiState(UiStates.VEHICLES_SHARED_SUCCESS);
  };

  const handleError = (error: unknown) => {
    captureException(error);
    if (!isInvalidSessionError(error)) {
      setError('Error updating vehicle permissions');
    }
  };

  const handlePermissionUpdate = async (actionType: VehiclePermissionsAction) => {
    try {
      setError(null);
      setLoadingState(true, getLoadingMessage(actionType), true);
      await updateVehiclePermissions({
        permissionTemplateId,
        expiration: getNewExpirationDate(vehicle, actionType),
        vehicle: vehicle,
      });
      handleSuccess(actionType);
    } catch (err) {
      handleError(err);
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
      <ManageVehicleDetails vehicle={vehicle} />
      {!!error && <ErrorMessage message={error} />}
      <ManageVehicleFooter onRevoke={handleRevoke} onExtend={handleExtend} />
    </>
  );
};

export default ManageVehicle;
