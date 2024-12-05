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
    //If Dev is using popup mode, we simply exit the flow here and close the window
    //By this point the dev should already have the transaction data, so this screen is mainly for the users UX, for them to know what happened
    //Redirect mode however, the user controls when the data is sent because we need to perform a redirect

    if (window.opener) {
      //Popup Mode
      window.close();
    } else if (isStandalone() && componentData.transactionHash) {
      //Redirect Mode
      window.location.href = `${redirectUri}?transactionHash=${componentData.transactionHash}`;
    }
  };

  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[308px]">
      <Header title="Successful Transaction!" subtitle={""} />
      <div className="space-y-4">
        <div className="flex justify-center">
          <PrimaryButton onClick={handleBackToThirdParty} width="max-w-[440px]">
            Back to {devLicenseAlias}
          </PrimaryButton>
        </div>
        <div className="flex justify-center">
          <PrimaryButton onClick={handleView} width="w-[214px]">
            View Transaction
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
};

export default SuccessfulTransaction;
