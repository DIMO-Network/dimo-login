import React from 'react';

import { AppleIcon, GoogleIcon } from '../Icons';
import { AuthProvider } from '../../utils/authUrls';
import { PrimaryButton, SSOButton } from '../Shared';

interface EmailInputFormProps {
  email: string;
  onEmailChange: (email: string) => void;
  onContinue: () => void;
  onProviderAuth: (provider: AuthProvider) => void;
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
        onClick={() => onProviderAuth(AuthProvider.GOOGLE)}
        icon={<GoogleIcon />}
        text="Sign in with Google"
      />
      <SSOButton
        onClick={() => onProviderAuth(AuthProvider.APPLE)}
        icon={<AppleIcon />}
        text="Sign in with Apple"
      />
    </div>
  </>
);
