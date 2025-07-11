import React from 'react';

import { backToThirdParty } from '../../utils/messageHandler';
import { isEmbed } from '../../utils/isEmbed';
import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';

import { ErrorContent, Header, PrimaryButton } from '../Shared';

export const SuccessfulTransaction: React.FC = () => {
  const { redirectUri, utm, devLicenseAlias } = useDevCredentials();
  const { componentData } = useUIManager();
  const { jwt } = useAuthContext();

  if (!componentData.transactionHash) {
    return (
      <ErrorContent
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
    <>
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
          <PrimaryButton onClick={handleView} width="w-64">
            View Transaction
          </PrimaryButton>
        </div>
      </div>
    </>
  );
};

export default SuccessfulTransaction;
