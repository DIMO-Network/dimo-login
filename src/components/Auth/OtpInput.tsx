import React, { useEffect, useState } from 'react';
import ErrorMessage from '../Shared/ErrorMessage';
import PrimaryButton from '../Shared/PrimaryButton';
import SecondaryButton from '../Shared/SecondaryButton';
import Header from '../Shared/Header';
import { useUIManager } from '../../context/UIManagerContext';
import { sendOtp } from '../../services';
import debounce from 'lodash/debounce';
import { Loader } from '../Shared';
import Logo from '../Shared/Logo';
import { useAuthContext } from '../../context/AuthContext';

interface OtpInputProps {
  email: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({ email }) => {
  const { user } = useAuthContext();
  const { completeOTPLogin } = useAuthContext();
  const { error, setError } = useUIManager();
  const [otpArray, setOtpArray] = useState(Array(6).fill(''));
  const [otpId, setOtpId] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtpCode = async () => {
    try {
      const result = await sendOtp(user.email);
      if (!result.success) {
        return setError(result.error ?? 'Failed to send OTP code');
      }
      setOtpId(result.data.otpId);
    } catch (err) {
      let msg = 'Failed to send OTP code';
      if (err instanceof Error) {
        msg = err.message || msg;
      }
      setError(msg);
    }
  };

  useEffect(() => {
    // We need to debounce this call because for some reason this component gets un-mounted
    // Which then leads to a double OTP send
    // Debouncing the function prevents this by canceling the first function call that happens before the component gets un-mounted
    const callback = debounce(() => {
      void sendOtpCode();
    }, 1000);
    callback();
    return () => {
      callback.cancel();
    };
  }, []);

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
    try {
      if (!otpArray) return;
      setLoading(true);
      const otpCode = otpArray.join('');
      await completeOTPLogin({ otpId, otpCode });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unknown error occurred trying to verify your OTP',
      );
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <>
        <Logo />
        <Loader message={'Verifying OTP'} />
      </>
    );
  }

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
