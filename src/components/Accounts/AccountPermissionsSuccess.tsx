import React from 'react';

import { Header, PrimaryButton } from '../Shared';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { buildAuthPayload } from '../../utils/authUtils';
import { useAuthContext } from '../../context/AuthContext';
import { backToThirdParty } from '../../utils/messageHandler';
import { isEmbed } from '../../utils/isEmbed';

// Account-grant success screen. Mirrors SuccessfulPermissions but with
// document-oriented copy and no vehicle list (componentData carries no vehicles
// on the account lane, so reusing the vehicle screen would be wrong/unsafe).
export const AccountPermissionsSuccess: React.FC = () => {
  const { redirectUri, utm, devLicenseAlias, clientId } = useDevCredentials();
  const { jwt, user } = useAuthContext();

  const handleBackToThirdParty = () => {
    const authPayload = buildAuthPayload(clientId, jwt, user);
    backToThirdParty({ ...authPayload, accountGranted: true }, redirectUri, utm);
  };

  return (
    <>
      <Header
        title="You have successfully shared your documents!"
        subtitle={''}
      />
      <div className="flex flex-col gap-4 w-full max-w-[440px] text-sm text-[#313131]">
        <p>
          {devLicenseAlias || 'The application developer'} can now view your
          driver's license and insurance card until you revoke access.
        </p>
      </div>
      <div className="flex flex-col">
        {!isEmbed() && (
          <div className="flex justify-center w-full">
            <PrimaryButton onClick={handleBackToThirdParty} width="sm:w-64 w-full">
              Back to {devLicenseAlias}
            </PrimaryButton>
          </div>
        )}
      </div>
    </>
  );
};

export default AccountPermissionsSuccess;
