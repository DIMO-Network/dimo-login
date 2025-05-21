import React from 'react';

import { clearLoggedEmail, getLoggedEmail } from '../../services/storageService';
import { PrimaryButton, SecondaryButton } from '../Shared';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { LoginType } from './EmailInput';

interface CachedEmailProps {
  onContinue: (loginType: LoginType) => void;
  onSwitchAccount: () => void;
}

export const CachedEmail: React.FC<CachedEmailProps> = ({
  onContinue,
  onSwitchAccount,
}) => {
  const { clientId } = useDevCredentials();
  const handleSwitchAccount = () => {
    clearLoggedEmail(clientId);
    onSwitchAccount();
  };
  return (
    <>
      <p className="text-sm">Login with {getLoggedEmail(clientId)}</p>
      <PrimaryButton
        onClick={() => onContinue(LoginType.PASSKEY)}
        width="w-full lg:w-[440px]"
      >
        Continue
      </PrimaryButton>
      <SecondaryButton
        onClick={handleSwitchAccount}
        width="w-full lg:w-[440px]"
        className="rounded-full border border-gray-300 px-4 py-2"
      >
        Login to a different account
      </SecondaryButton>
    </>
  );
};
