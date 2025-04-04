import React, { useEffect, useState, type FC } from 'react';

import { Card } from '../Shared/Card';
import { Header } from '../Shared/Header';
import { PrimaryButton } from '../Shared/PrimaryButton';
import { DevicesIcon, FingerprintIcon, IconProps, SecurityIcon } from '../Icons';
import { useAuthContext } from '../../context/AuthContext';
import { UiStates, useUIManager } from '../../context/UIManagerContext';

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
  const { createAccountWithPasskey, sendOtp, authenticateUser, user } = useAuthContext();
  const { setUiState, componentData, entryState } = useUIManager();
  const [triggerAuth, setTriggerAuth] = useState(false);

  const handleOtpSend = async (email: string) => {
    const otpResult = await sendOtp(email); // Send OTP for new account

    if (otpResult.success && otpResult.data.otpId) {
      setUiState(UiStates.OTP_INPUT, {
        setBack: true,
        removeCurrent: true,
      });
    }
  };

  const handlePasskeyGeneration = async () => {
    const account = await createAccountWithPasskey(email);

    //MOVE TO AUTHENTICATE, IF FROM SSO
    if (account.success && account.data.user) {
      if (componentData && componentData.emailValidated) {
        setTriggerAuth(true); //Essentially waits for state updates, before authenticating the user
      } else {
        await handleOtpSend(email);
      }
    } else {
      console.error('Account creation failed'); // Handle account creation failure
    }
  };

  useEffect(() => {
    // Only authenticate if `user` is set and authentication hasn't been triggered
    if (user && user.subOrganizationId && componentData && componentData.emailValidated) {
      authenticateUser(componentData.emailValidated, 'credentialBundle', entryState);
    }
  }, [triggerAuth]);

  const renderBenefit = ({ Icon, title, description }: PasskeyBenefitProps) => {
    return (
      <div
        className="flex flex-col gap-2 w-full mt-2 p-4 rounded-2xl cursor-pointer transition bg-gray-50 text-gray-500 cursor-not-allowed"
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

  return (
    <Card
      width="w-full max-w-[600px]"
      height="h-fit"
      className="flex flex-col gap-6 items-center"
    >
      <Header title="Add a passkey" />
      <div className="flex flex-col gap-3 max-w-[440px]">
        <div className="passkey-description">
          <p className="text-sm">
            DIMO uses passkeys to keep your account and data secure.
          </p>
        </div>
        <div className="passkey-benefits">{PASSKEY_BENEFITS.map(renderBenefit)}</div>
        <div className="actions">
          <PrimaryButton onClick={handlePasskeyGeneration} width="w-full">
            Add a passkey
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
};
