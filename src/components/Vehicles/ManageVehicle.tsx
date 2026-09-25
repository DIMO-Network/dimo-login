import React, { useEffect, useState } from 'react';
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
import { useAuthContext } from '../../context/AuthContext';
import {
  checkDocumentAccess,
  GrantUnreadableError,
  toCloudEventAgreements,
} from '../../services/vehicleDocumentAgreements';

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
  const { expirationDate, cloudEvent } =
    useDevCredentials<VehicleManagerMandatoryParams>();
  const { user } = useAuthContext();
  const updateVehiclePermissions = useUpdateVehiclePermissions();

  // The vehicle was captured when its card was clicked, possibly before the
  // list's file check returned. Finish that check here so the right action
  // (Update vs Extend) is offered.
  const requestedFiles = toCloudEventAgreements(cloudEvent);
  const mustCheck =
    vehicle.shared && requestedFiles.length > 0 && vehicle.documentAccess === undefined;
  const [documentAccess, setDocumentAccess] = useState(vehicle.documentAccess);
  // Starts true when a check is due, so no frame offers Extend before it runs.
  const [checking, setChecking] = useState(mustCheck);
  useEffect(() => {
    if (!mustCheck) return;
    let cancelled = false;
    checkDocumentAccess(vehicle, requestedFiles, user?.smartContractAddress).then(
      (access) => {
        if (cancelled) return;
        setDocumentAccess(access);
        setChecking(false);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const currentVehicle = { ...vehicle, documentAccess };
  const needsUpdate = needsPermissionUpdate(
    currentVehicle,
    permissions,
    permissionTemplateId,
  );

  const handleSuccess = (actionType: VehiclePermissionsAction) => {
    vehicle.shared = false;
    setComponentData({ action: SUCCESS_ACTIONS[actionType], vehicles: [vehicle] });
    setUiState(UiStates.VEHICLES_SHARED_SUCCESS);
  };

  const handleError = (error: unknown) => {
    captureException(error);
    if (error instanceof GrantUnreadableError) {
      setError(error.message);
    } else if (!isInvalidSessionError(error)) {
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
        vehicle: currentVehicle,
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
      <ManageVehicleDetails vehicle={currentVehicle} needsUpdate={needsUpdate} />
      {!!error && <ErrorMessage message={error} />}
      <ManageVehicleFooter
        onRevoke={handleRevoke}
        onExtend={handleExtend}
        onUpdate={handleUpdate}
        needsUpdate={needsUpdate}
        // Wait for the file check, or Extend could be offered where Update is due.
        disabled={checking}
      />
    </UIManagerLoaderWrapper>
  );
};

export default ManageVehicle;
