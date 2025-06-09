import React, { useEffect, useState, type FC } from 'react';

import { Header } from '../Shared/Header';
import { PrimaryButton } from '../Shared/PrimaryButton';
import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import ErrorMessage from '../Shared/ErrorMessage';
import { Benefits } from '../Passkey/PasskeyBenefits';

interface PasskeyGenerationProps {
  email: string;
}

export const PasskeyGeneration: FC<PasskeyGenerationProps> = ({ email }) => {
  const { createAccountWithPasskey, authenticateUser, user } = useAuthContext();
  const { componentData, entryState, error } = useUIManager();
  const [triggerAuth, setTriggerAuth] = useState(false);

  const handlePasskeyGeneration = async () => {
    const account = await createAccountWithPasskey(email);
    if (account.success && account.data.user) {
      setTriggerAuth(true);
    } else {
      console.error('Account creation failed');
    }
  };

  useEffect(() => {
    // Only authenticate if `user` is set and authentication hasn't been triggered
    if (user && user.subOrganizationId && componentData && componentData.emailValidated) {
      authenticateUser(componentData.emailValidated, 'credentialBundle', entryState);
    }
  }, [triggerAuth]);

  return (
    <>
      <Header title="Add a passkey for faster and safer login" description={email} />
      {error && <ErrorMessage message={error} />}

      <div className={'flex flex-col gap-3'}>
        <p className={'text-sm text-[#313131] font-medium mt-10'}>
          DIMO uses passkeys to keep your account and data secure.
        </p>
        <Benefits />
        <PrimaryButton onClick={handlePasskeyGeneration} width="w-full">
          Add a passkey
        </PrimaryButton>
      </div>
    </>
  );
};
