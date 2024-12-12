// src/components/SuccessPage.tsx
import React from "react";
import { useAuthContext } from "../../context/AuthContext";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import PrimaryButton from "../Shared/PrimaryButton";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import {
  buildAuthPayload,
  logout,
  sendAuthPayloadToParent,
} from "../../utils/authUtils";
import { useUIManager } from "../../context/UIManagerContext";
import { isEmbed } from "../../utils/isEmbed";
import { backToThirdParty } from "../../utils/messageHandler";

const SuccessPage: React.FC = () => {
  const { user, jwt } = useAuthContext(); // Should be set on session init
  const { redirectUri, clientId, devLicenseAlias } = useDevCredentials();
  const { setUiState } = useUIManager();

  const sendJwtAfterPermissions = () => {
    if (jwt && redirectUri && clientId) {
      const authPayload = buildAuthPayload(clientId, jwt, user);
      sendAuthPayloadToParent(authPayload, redirectUri, (payload) => {
        backToThirdParty(payload, redirectUri);        
      });
    }
  };

  const handleContinue = () => {
    sendJwtAfterPermissions();
  };

  const handleLogout = () => {
    if (redirectUri && clientId) {
      logout(clientId, redirectUri, setUiState);
    }
  };

  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[308px]">
      <Header title="You are logged in!" subtitle={user.email} />
      <div className="space-y-4">
        {!isEmbed() && (
          <div className="flex justify-center">
            <PrimaryButton onClick={handleContinue} width="w-64">
              Back to {devLicenseAlias}
            </PrimaryButton>
          </div>
        )}
        <div className="flex justify-center">
          <PrimaryButton onClick={handleLogout} width="w-32">
            Logout
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
};

export default SuccessPage;
