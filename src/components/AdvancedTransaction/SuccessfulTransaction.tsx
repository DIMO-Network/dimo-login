// src/components/SuccessPage.tsx
import React from "react";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import PrimaryButton from "../Shared/PrimaryButton";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import ErrorScreen from "../Shared/ErrorScreen";
import { isStandalone } from "../../utils/isStandalone";
import { useUIManager } from "../../context/UIManagerContext";

const SuccessfulTransaction: React.FC = () => {
  const { redirectUri, devLicenseAlias } = useDevCredentials();
  const { componentData } = useUIManager();

  if (!componentData.transactionHash) {
    return (
      <ErrorScreen
        title="Invalid Navigation"
        message="Please check the configuration and reload the page."
      />
    );
  }

  const handleView = () => {
    if (componentData.transactionHash) {
      const scanBaseUrl =
        process.env.REACT_APP_ENVIRONMENT == "prod"
          ? "https://polygonscan.com"
          : "https://amoy.polygonscan.com";

      window.open(`${scanBaseUrl}/tx/${componentData.transactionHash}`);
    }
  };
  
  const handleBackToThirdParty = () => {
    if (window.opener) {
      //Popup Mode
      window.close();
    } else if (isStandalone()) {
      //Redirect Mode
      window.location.href = `${redirectUri}`;
    }
  };

  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[308px]">
      <Header title="Successful Transaction!" subtitle={""} />
      <div className="flex justify-center">
        <PrimaryButton onClick={handleBackToThirdParty} width="max-w-[440px]">
          Back to {devLicenseAlias}
        </PrimaryButton>
        </PrimaryButton>        
        <PrimaryButton onClick={handleView} width="w-[214px]">
          View Transaction
        </PrimaryButton>
      </div>
    </Card>
  );
};

export default SuccessfulTransaction;
