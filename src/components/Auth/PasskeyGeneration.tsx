import React, { type FC, useState } from 'react';

import { Header } from '../Shared/Header';
import { PrimaryButton } from '../Shared/PrimaryButton';
import { useAuthContext } from '../../context/AuthContext';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { Benefits } from '../Passkey/PasskeyBenefits';
import { ErrorMessage, Loader } from '../Shared';
import { createAccount, createPasskey } from '../../services';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import Logo from '../Shared/Logo';
import { UserObject } from '../../models/user';

interface PasskeyGenerationProps {
  email: string;
}

export const PasskeyGeneration: FC<PasskeyGenerationProps> = ({ email }) => {
  const { setUser } = useAuthContext();
  const { setError, error, setUiState } = useUIManager();
  const { apiKey } = useDevCredentials();
  const [isLoading, setIsLoading] = useState(false);

  const createAccountWithPasskey = async (email: string): Promise<UserObject> => {
    const [attestation, challenge] = await createPasskey(email);
    return await createAccount({
      email,
      apiKey,
      attestation,
      challenge,
      deployAccount: true,
    });
  };
  const handlePasskeyGeneration = async () => {
    try {
      setIsLoading(true);
      const newAccount = await createAccountWithPasskey(email);
      setUser(newAccount);
      setIsLoading(false);
      setUiState(UiStates.PASSKEY_LOGIN);
    } catch (err) {
      setError('There was an error creating your account');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <CustomLoader />;
  }

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

// Using a custom loader here instead of the UIManagerLoader
// because the UIManagerLoader will un-render this component
// and cause the useEffect to not behave as intended
const CustomLoader = () => {
  return (
    <>
      <Logo />
      <Loader message={'Creating your account. This may take a few minutes.'} />
    </>
  );
};
