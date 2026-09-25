import React from 'react';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { isInvalidSessionError } from '../../utils/authUtils';
import { captureException } from '@sentry/react';
import { UIManagerLoaderWrapper, ErrorMessage } from '../Shared';
import { useUpdateVehiclePermissions } from '../../hooks';
import { VehiclePermissionsAction } from '../../types';
import { getNewExpirationDate } from '../../utils/vehicles';
import { ManageVehicleDetails } from './ManageVehicleDetails';
import { ManageVehicleFooter } from './ManageVehicleFooter';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { VehicleManagerMandatoryParams } from '../../types';
import { needsPermissionUpdate } from '../../utils/permissions';

const LOADING_MESSAGES: Record<VehiclePermissionsAction, string> = {
  revoke: 'Revoking vehicles',
  extend: 'Extending vehicles',
  update: 'Updating permissions',
};

// 'update' reports back as 'shared' so the app receives sharedVehicles, the
// same as a first-time share with the requested permissions.
const SUCCESS_ACTIONS: Record<VehiclePermissionsAction, string> = {
  revoke: 'revoked',
  extend: 'extended',
  update: 'shared',
};

export const ManageVehicle: React.FC = () => {
  const {
    componentData: { vehicle, permissionTemplateId, permissions },
    setUiState,
    setComponentData,
    setLoadingState,
    setError,
    error,
  } = useUIManager();
  const { expirationDate } = useDevCredentials<VehicleManagerMandatoryParams>();
  const updateVehiclePermissions = useUpdateVehiclePermissions();
  const needsUpdate = needsPermissionUpdate(vehicle, permissions, permissionTemplateId);

  const handleSuccess = (actionType: VehiclePermissionsAction) => {
    vehicle.shared = false;
    setComponentData({ action: SUCCESS_ACTIONS[actionType], vehicles: [vehicle] });
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
      setLoadingState(true, LOADING_MESSAGES[actionType], true);
      await updateVehiclePermissions({
        permissionTemplateId,
        permissions,
        expiration: getNewExpirationDate(vehicle, actionType, expirationDate),
        vehicle: vehicle,
        action: actionType,
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

  const handleUpdate = () => {
    handlePermissionUpdate('update');
  };

  return (
    <UIManagerLoaderWrapper>
      <ManageVehicleDetails vehicle={vehicle} needsUpdate={needsUpdate} />
      {!!error && <ErrorMessage message={error} />}
      <ManageVehicleFooter
        onRevoke={handleRevoke}
        onExtend={handleExtend}
        onUpdate={handleUpdate}
        needsUpdate={needsUpdate}
      />
    </UIManagerLoaderWrapper>
  );
};

export default ManageVehicle;
