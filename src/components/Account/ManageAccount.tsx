import React from 'react';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { isInvalidSessionError } from '../../utils/authUtils';
import { captureException } from '@sentry/react';
import { UIManagerLoaderWrapper, ErrorMessage } from '../Shared';
import { useUpdateAccountPermissions } from '../../hooks';
import { PrimaryButton, SecondaryButton } from '../Shared';

type AccountPermissionsAction = 'revoke' | 'extend';

const getLoadingMessage = (actionType: AccountPermissionsAction) => {
  return actionType === 'revoke' ? 'Revoking account permissions' : 'Extending account permissions';
};

const getNewExpirationDate = (actionType: AccountPermissionsAction): bigint => {
  const now = Date.now();
  if (actionType === 'revoke') {
    // Set expiration to now (effectively revoking)
    return BigInt(Math.floor(now / 1000));
  } else {
    // Extend by 1 year
    return BigInt(Math.floor((now + 365 * 24 * 60 * 60 * 1000) / 1000));
  }
};

export const ManageAccount: React.FC = () => {
  const {
    componentData: { permissionTemplateId, permissions },
    setUiState,
    setComponentData,
    setLoadingState,
    setError,
    error,
  } = useUIManager();
  const updateAccountPermissions = useUpdateAccountPermissions();

  const handleSuccess = (actionType: AccountPermissionsAction) => {
    const newAction = actionType === 'revoke' ? 'revoked' : 'extended';
    setComponentData({ action: newAction });
    setUiState(UiStates.ACCOUNT_SHARED_SUCCESS);
  };

  const handleError = (error: unknown) => {
    captureException(error);
    if (!isInvalidSessionError(error)) {
      setError('Error updating account permissions');
    }
  };

  const handlePermissionUpdate = async (actionType: AccountPermissionsAction) => {
    try {
      setError(null);
      setLoadingState(true, getLoadingMessage(actionType), true);
      await updateAccountPermissions({
        permissionTemplateId,
        permissions,
        expiration: getNewExpirationDate(actionType),
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

  const handleExtend = () => {
    handlePermissionUpdate('extend');
  };

  return (
    <UIManagerLoaderWrapper>
      <div className="flex flex-col w-full items-center justify-center">
        <h2 className="text-xl font-semibold mb-4">Manage Account Permissions</h2>

        <p className="text-gray-700 mb-6">
          Update permissions for this developer's access to your account.
        </p>

        {!!error && <ErrorMessage message={error} />}

        <div className="flex gap-2 w-full justify-center mt-4">
          <SecondaryButton onClick={handleRevoke}>
            Revoke
          </SecondaryButton>
          <PrimaryButton onClick={handleExtend}>
            Extend
          </PrimaryButton>
        </div>
      </div>
    </UIManagerLoaderWrapper>
  );
};

export default ManageAccount;
