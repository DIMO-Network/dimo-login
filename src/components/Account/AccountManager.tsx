import React from 'react';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { UIManagerLoaderWrapper } from '../Shared';
import { PrimaryButton, SecondaryButton } from '../Shared';
import { useShareAccount, useFinishShareAccount } from '../../hooks';
import { captureException } from '@sentry/react';
import { isInvalidSessionError } from '../../utils/authUtils';
import { Vehicle } from '../../models/vehicle';
import { backToThirdParty } from '../../utils/messageHandler';
import { useAuthContext } from '../../context/AuthContext';
import { buildAuthPayload } from '../../utils/authUtils';

export const AccountManager: React.FC = () => {
  const { devLicenseAlias, permissionScope, redirectUri, utm, clientId } = useDevCredentials();
  const { componentData, setLoadingState, setError, goBack } = useUIManager();
  const { jwt, user } = useAuthContext();
  const handleShareAccount = useShareAccount();
  const finishShareAccount = useFinishShareAccount();

  // Check if we're in a sequential "both" flow
  const isSequentialFlow = permissionScope === 'both';
  const sharedVehicles: Vehicle[] = componentData?.sharedVehicles || [];

  const onShare = async () => {
    try {
      setLoadingState(true, 'Sharing account permissions', true);
      await handleShareAccount();
      finishShareAccount();
    } catch (error) {
      captureException(error);
      if (!isInvalidSessionError(error)) {
        setError('Failed to share account permissions');
      }
    } finally {
      setLoadingState(false);
    }
  };

  const onSkip = () => {
    // User doesn't want to share account permissions
    // But we already shared vehicles (if any), so still send that data back
    if (isSequentialFlow) {
      const authPayload = buildAuthPayload(clientId, jwt, user, {
        sharedVehicles: sharedVehicles.map((v) => v.tokenId.toString()),
        accountShared: false,
      });
      backToThirdParty(authPayload, redirectUri, utm);
    }
  };

  const onBack = () => {
    if (isSequentialFlow) {
      goBack();
    }
  };

  return (
    <UIManagerLoaderWrapper>
      <div className="flex flex-col w-full items-center justify-center box-border">
        {isSequentialFlow && (
          <div className="mb-4 w-full">
            <span className="text-sm text-gray-600">Step 2 of 2</span>
            {sharedVehicles.length > 0 && (
              <div className="text-sm text-green-600 mt-1">
                ✓ {sharedVehicles.length} vehicle(s) shared
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold mb-4">Share Account Permissions</h2>

          <p className="text-gray-700 mb-6">
            Grant {devLicenseAlias || 'this developer'} access to your account
          </p>

          <p className="text-sm text-gray-500 mb-8">
            This will allow the developer to access account-level permissions on your behalf.
          </p>
        </div>

        <div className="flex gap-2 w-full justify-center mt-4">
          {isSequentialFlow && (
            <SecondaryButton onClick={onBack}>
              Back
            </SecondaryButton>
          )}

          {isSequentialFlow && (
            <SecondaryButton onClick={onSkip}>
              Skip
            </SecondaryButton>
          )}

          {!isSequentialFlow && (
            <SecondaryButton onClick={() => backToThirdParty({}, redirectUri, utm)}>
              Cancel
            </SecondaryButton>
          )}

          <PrimaryButton onClick={onShare}>
            Share Account
          </PrimaryButton>
        </div>
      </div>
    </UIManagerLoaderWrapper>
  );
};

export default AccountManager;
