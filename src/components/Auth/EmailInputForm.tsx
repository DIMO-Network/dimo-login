import React from 'react';

import { PrimaryButton, SSOButton } from '../Shared';
import { GoogleIcon, AppleIcon } from '../Icons';

interface EmailInputFormProps {
  email: string;
  onEmailChange: (email: string) => void;
  onContinue: () => void;
  onProviderAuth: (provider: 'google' | 'apple') => void;
}

export const EmailInputForm: React.FC<EmailInputFormProps> = ({
  email,
  onEmailChange,
  onContinue,
  onProviderAuth,
}) => (
  <>
    <input
      type="email"
      value={email}
      onChange={(e) => onEmailChange(e.target.value)}
      placeholder="Enter your email"
      className="p-2 border border-gray-300 rounded-md w-full lg:w-[440px]"
    />
    <PrimaryButton onClick={onContinue} width="w-full lg:w-[440px]">
      Continue
    </PrimaryButton>
    <div className="flex flex-wrap sm:flex-nowrap justify-between gap-3 w-full">
      <SSOButton
        onClick={() => onProviderAuth('google')}
        icon={<GoogleIcon />}
        text="Sign in with Google"
      />
      <SSOButton
        onClick={() => onProviderAuth('apple')}
        icon={<AppleIcon />}
        text="Sign in with Apple"
      />
    </div>
  </>
);
