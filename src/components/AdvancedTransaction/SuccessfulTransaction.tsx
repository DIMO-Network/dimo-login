import React from 'react';

import { backToThirdParty } from '../../utils/messageHandler';
import { isEmbed } from '../../utils/isEmbed';
import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';

import Card from '../Shared/Card';
import ErrorScreen from '../Shared/ErrorScreen';
import Header from '../Shared/Header';
import PrimaryButton from '../Shared/PrimaryButton';

export const SuccessfulTransaction: React.FC = () => {
  const { redirectUri, utm, devLicenseAlias } = useDevCredentials();
  const { componentData } = useUIManager();
  const { jwt } = useAuthContext();

  if (!componentData.transactionHash) {
    return (
      <ErrorScreen
        title="Missing Transaction Hash"
        message="Transaction was not successfully completed."
      />
    );
  }

  const handleView = () => {
    if (componentData.transactionHash) {
      const scanBaseUrl =
        process.env.REACT_APP_ENVIRONMENT === 'prod'
          ? 'https://polygonscan.com'
          : 'https://amoy.polygonscan.com';

      window.open(`${scanBaseUrl}/tx/${componentData.transactionHash}`);
    }
  };

  const handleBackToThirdParty = () => {
    //If Dev is using popup mode, we simply exit the flow here and close the window
    //By this point the dev should already have the transaction data, so this screen is mainly for the users UX, for them to know what happened
    //Redirect mode however, the user controls when the data is sent because we need to perform a redirect
    const payload = {
      transactionHash: componentData.transactionHash,
      token: jwt,
    };
    backToThirdParty(payload, redirectUri, utm);
  };

  return (
    <Card
      width="w-full max-w-[600px]"
      height="h-fit"
      className="flex flex-col items-center"
    >
      <div className="flex flex-col gap-6 w-[440px]">
        <Header title="Successful Transaction!" subtitle={''} />
        <div className="space-y-4 w-full">
          {!isEmbed() && (
            <div className="flex justify-center">
              <PrimaryButton onClick={handleBackToThirdParty} width="w-64">
                Back to {devLicenseAlias}
              </PrimaryButton>
            </div>
          )}
          <div className="flex justify-center">
            <PrimaryButton onClick={handleView} width="w-32">
              View Transaction
            </PrimaryButton>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SuccessfulTransaction;
