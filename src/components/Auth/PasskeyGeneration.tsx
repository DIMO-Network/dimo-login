import React, { type FC, useEffect, useState } from 'react';

import { Header } from '../Shared/Header';
import { PrimaryButton } from '../Shared/PrimaryButton';
import { DevicesIcon, FingerprintIcon, IconProps, SecurityIcon } from '../Icons';
import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import { useHandleAuthenticateUser } from '../../hooks/UseHandleAuthenticateUser';
import { ErrorMessage, Loader } from '../Shared';
import { createAccount, createPasskey } from '../../services';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import Logo from '../Shared/Logo';
import { UserObject } from '../../models/user';

interface PasskeyBenefitProps {
  Icon: FC<IconProps>;
  title: string;
  description: string;
}

const PASSKEY_BENEFITS: PasskeyBenefitProps[] = [
  {
    Icon: FingerprintIcon,
    title: 'No need to remember a password',
    description: 'Passkeys are digital signatures that use Face ID or biometrics.',
  },
  {
    Icon: SecurityIcon,
    title: 'Advanced protection',
    description: 'Passkeys offer phishing-resistant technology to keep you safe.',
  },
  {
    Icon: DevicesIcon,
    title: 'Seamless authentication',
    description: 'Sign in and approve requests in an instant.',
  },
];

interface PasskeyGenerationProps {
  email: string;
}

export const PasskeyGeneration: FC<PasskeyGenerationProps> = ({ email }) => {
  const { user, setUser } = useAuthContext();
  const authenticateUser = useHandleAuthenticateUser();
  const { setError, error } = useUIManager();
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
    } catch (err) {
      setError('There was an error creating your account');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user.subOrganizationId) {
      setIsLoading(false);
      authenticateUser();
    }
  }, [user.subOrganizationId]);

  if (isLoading) {
    return <CustomLoader />;
  }
  return (
    <>
      <Header title="Add a passkey" />
      {error && <ErrorMessage message={error} />}
      <div className="passkey-description">
        <p className="text-sm">
          DIMO uses passkeys to keep your account and data secure.
        </p>
      </div>
      <PasskeyBenefitsList />
      <div className="actions">
        <PrimaryButton onClick={handlePasskeyGeneration} width="w-full">
          Add a passkey
        </PrimaryButton>
      </div>
    </>
  );
};

// Using a custom loader here instead of the ConnectedLoader
// because the ConnectedLoader will un-render this component
// and cause the useEffect to not behave as intended
const CustomLoader = () => {
  return (
    <>
      <Logo />
      <Loader message={'Creating your account'} />
    </>
  );
};

const PasskeyBenefitsList = () => {
  const renderBenefit = ({ Icon, title, description }: PasskeyBenefitProps) => {
    return (
      <div
        className="flex flex-col gap-2 w-full mt-2 p-4 rounded-2xl transition bg-gray-50 text-gray-500"
        key={title}
      >
        <div className="flex flex-row gap-2 font-medium text-sm text-black">
          <Icon className="w-5 h-5" />
          <p>{title}</p>
        </div>
        <div className="">
          <p className="text-sm text-black">{description}</p>
        </div>
      </div>
    );
  };
  return <div className="passkey-benefits">{PASSKEY_BENEFITS.map(renderBenefit)}</div>;
};
