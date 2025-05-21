import React, { useCallback, useState } from 'react';
import ErrorMessage from '../Shared/ErrorMessage';
import PrimaryButton from '../Shared/PrimaryButton';
import SecondaryButton from '../Shared/SecondaryButton';
import Header from '../Shared/Header';
import { useUIManager } from '../../context/UIManagerContext';
import { verifyOtp } from '../../services';
import { decryptBundle, getPublicKey, generateP256KeyPair } from '@turnkey/crypto';
import { uint8ArrayToHexString } from '@turnkey/encoding';
import { ApiKeyStamper } from '@turnkey/api-key-stamper';
import { useHandleAuthenticateUser } from '../../hooks/UseHandleAuthenticateUser';
import { TStamper } from '@turnkey/http/dist/base';
import { useAuthContext } from '../../context/AuthContext';

interface OtpInputProps {
  email: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({ email }) => {
  const { beginOtpLogin, otpId } = useAuthContext();
  const { error, setError } = useUIManager();
  const [otpArray, setOtpArray] = useState(Array(6).fill(''));
  const authenticateUser = useHandleAuthenticateUser();

  const sendOtpCode = useCallback(async () => {
    const result = await beginOtpLogin();
    if (!result.success) {
      return setError('Failed to send OTP code');
    }
  }, [beginOtpLogin, setError]);

  // Function to handle change for each input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target;

    // Detect paste event for the full OTP
    if (value.length === 6) {
      const newOtpArray = value.split('').slice(0, 6); // Only stake the first 6 characters
      setOtpArray(newOtpArray);

      // Move focus to the last input
      document?.getElementById(`otp-input-5`)?.focus();
      return;
    }

    if (value.length <= 1) {
      const newOtpArray = [...otpArray];
      newOtpArray[index] = value;
      setOtpArray(newOtpArray);

      // Move focus to the next input
      if (value && index < 5) {
        document?.getElementById(`otp-input-${index + 1}`)?.focus();
      }
    }
  };

  const handleSubmit = async () => {
    let apiKeyStamper: TStamper | null = null;
    try {
      if (!otpArray) return;
      const otpCode = otpArray.join('');
      const keyPair = generateP256KeyPair();
      const { credentialBundle } = await verifyOtp({
        email,
        otpCode: otpCode,
        otpId,
        key: keyPair.publicKeyUncompressed,
      });
      const privateKey = decryptBundle(credentialBundle, keyPair.privateKey);
      const publicKey = uint8ArrayToHexString(getPublicKey(privateKey, true));
      apiKeyStamper = new ApiKeyStamper({
        apiPublicKey: publicKey,
        apiPrivateKey: uint8ArrayToHexString(privateKey),
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unknown error occurred trying to verify your OTP',
      );
    }
    if (apiKeyStamper) {
      authenticateUser(apiKeyStamper);
    }
  };

  const handleBackspace = (id: string, index: number) => {
    const value = (document?.getElementById(id) as HTMLInputElement).value || '';
    if (value === '') {
      if (index > 0) {
        document?.getElementById(`otp-input-${index - 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }

    const {
      key,
      currentTarget: { id },
    } = e;
    if (key === 'Backspace') {
      setTimeout(() => handleBackspace(id, index), 100);
    }
  };

  return (
    <>
      <Header title="Please enter your OTP Code" subtitle={email || ''} />
      <p className="w-full tracking-tight text-center text-sm">
        A code was just sent to {email}, which will expire in 5 minutes. Check your spam
        if you don't see it, and resend.
      </p>

      {error && <ErrorMessage message={error} />}

      <div className="frame9 flex flex-col items-center gap-4 w-full">
        <div className="flex flex-row gap-3 w-full mt-8 justify-between">
          {otpArray.map((digit, index) => (
            <input
              key={index}
              id={`otp-input-${index}`}
              type="text"
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              maxLength={6}
              className={`w-10 h-10 lg:w-12 lg:h-12 border rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                error ? 'border-[#E80303]' : 'border-gray-300'
              }`}
            />
          ))}
        </div>
        <PrimaryButton onClick={handleSubmit} width="w-full">
          Verify email
        </PrimaryButton>
        <SecondaryButton onClick={sendOtpCode} width="w-full">
          Resend code
        </SecondaryButton>
      </div>
    </>
  );
};

export default OtpInput;
