// src/components/SuccessPage.tsx
import React from "react";
import { useAuthContext } from "../../context/AuthContext";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import PrimaryButton from "../Shared/PrimaryButton";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import { sendTokenToParent } from "../../utils/authUtils";

const SuccessPage: React.FC = () => {
  const { user, jwt } = useAuthContext(); // Should be set on session init
  const { redirectUri, setUiState } = useDevCredentials();

  const sendJwtAfterPermissions = () => {
    if (jwt && redirectUri) {
      sendTokenToParent(jwt, redirectUri, () => {
        setUiState("SUCCESS");
      });
    }
  };

  const handleContinue = () => {
    sendJwtAfterPermissions();
  };
  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[308px]">
      <Header title="You are logged in!" subtitle={user ? user.email : ""} />
      <div className="flex justify-center">
        <PrimaryButton onClick={handleContinue} width="w-[214px]">
          Continue
        </PrimaryButton>
      </div>
    </Card>
  );
};

export default SuccessPage;
