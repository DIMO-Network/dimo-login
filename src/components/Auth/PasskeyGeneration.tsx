import React, { useEffect, useState, type FC } from 'react';

import { Header } from '../Shared/Header';
import { PrimaryButton } from '../Shared/PrimaryButton';
import { DevicesIcon, FingerprintIcon, IconProps, SecurityIcon } from '../Icons';
import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import ErrorMessage from '../Shared/ErrorMessage';

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

const Benefits = () => {
  return (
    <div className={'flex gap-2 flex-col'}>
      {PASSKEY_BENEFITS.map((benefitProps) => {
        return <Benefit {...benefitProps} />;
      })}
    </div>
  );
};

const Benefit = ({ title, description, Icon }: PasskeyBenefitProps) => {
  return (
    <div
      className="flex flex-col gap-2 w-full p-4 rounded-2xl cursor-pointer transition bg-gray-50 text-gray-500"
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
