// src/components/SuccessPage.tsx
import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import Header from '../Shared/Header';
import PrimaryButton from '../Shared/PrimaryButton';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { buildAuthPayload, logout, sendAuthPayloadToParent } from '../../utils/authUtils';
import { useUIManager } from '../../context/UIManagerContext';
import { isEmbed } from '../../utils/isEmbed';
import { backToThirdParty } from '../../utils/messageHandler';
import { isEmailGranted, setEmailGranted } from '../../services/storageService';
import { getForceEmail } from '../../stores/AuthStateStore';
import { EmailPermissionCheckbox } from './EmailPermissionCheckbox';
import { ErrorMessage } from '../Shared';

export const SuccessPage: React.FC = () => {
  const { user, jwt } = useAuthContext(); // Should be set on session init
  const { redirectUri, utm, clientId, devLicenseAlias, oemBrand } = useDevCredentials();
  const displayName = oemBrand?.name || devLicenseAlias;
  const { setUiState } = useUIManager();
  // A returning session skips the sign-in screen, so a user who never chose
  // (or whose choice was lost) is asked here before going back to the app.
  const [askForEmail] = useState(() => !isEmailGranted(clientId, user?.email));
  const [emailShared, setEmailShared] = useState(false);
  const emailRequired = askForEmail && getForceEmail() && !emailShared;

  const toggleEmailShared = () => {
    const next = !emailShared;
    setEmailShared(next);
    setEmailGranted(clientId, user?.email, next);
  };

  const sendJwtAfterPermissions = () => {
    if (jwt && redirectUri && clientId) {
      const authPayload = buildAuthPayload(clientId, jwt, user);
      sendAuthPayloadToParent(authPayload, redirectUri, (payload) => {
        backToThirdParty(payload, redirectUri, utm);
      });
    }
  };

  const handleContinue = () => {
    if (emailRequired) return;
    sendJwtAfterPermissions();
  };

  const handleLogout = () => {
    if (redirectUri && clientId) {
      logout(clientId, redirectUri, utm, setUiState);
    }
  };

  return (
    <>
      <Header title="You are logged in!" subtitle={user.email} />
      {askForEmail && user?.email && (
        <EmailPermissionCheckbox
          isChecked={emailShared}
          onChange={toggleEmailShared}
          devLicenseAlias={displayName}
        />
      )}
      {emailRequired && !isEmbed() && (
        <ErrorMessage message="Email sharing is required to proceed. Please check the box." />
      )}
      <div className="space-y-4">
        {!isEmbed() && (
          <div className="flex justify-center">
            <PrimaryButton onClick={handleContinue} width="w-64" disabled={emailRequired}>
              Back to {displayName}
            </PrimaryButton>
          </div>
        )}
        <div className="flex justify-center">
          <PrimaryButton onClick={handleLogout} width="w-64">
            Logout
          </PrimaryButton>
        </div>
      </div>
    </>
  );
};

export default SuccessPage;
