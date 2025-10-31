import React from 'react';
import { Header, PrimaryButton } from '../Shared';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { isEmbed } from '../../utils/isEmbed';

export const AccountSharedSuccess: React.FC = () => {
  const { devLicenseAlias } = useDevCredentials();

  return (
    <>
      <Header
        title="Account Permissions Shared!"
        subtitle={`You have successfully granted ${devLicenseAlias || 'the developer'} access to your account.`}
      />
      <div className="flex flex-col items-center text-center py-8">
        <div className="text-green-600 text-5xl mb-4">✓</div>
        <p className="text-gray-700">
          Your account permissions have been successfully shared.
        </p>
      </div>
      {!isEmbed() && (
        <div className="flex justify-center w-full">
          <PrimaryButton onClick={() => window.close()} width="sm:w-64 w-full">
            Close
          </PrimaryButton>
        </div>
      )}
    </>
  );
};

export default AccountSharedSuccess;
