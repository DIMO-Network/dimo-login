import React, { type FC } from 'react';
import { DevicesIcon, FingerprintIcon, IconProps, SecurityIcon } from '../Icons';

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

export const Benefits = () => {
  return (
    <div className={'flex gap-2 flex-col'}>
      {PASSKEY_BENEFITS.map((benefitProps) => {
        return <Benefit key={benefitProps.title} {...benefitProps} />;
      })}
    </div>
  );
};

const Benefit = ({ title, description, Icon }: PasskeyBenefitProps) => {
  return (
    <div className="flex flex-col gap-2 w-full p-4 rounded-2xl cursor-pointer transition bg-gray-50 text-gray-500">
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
