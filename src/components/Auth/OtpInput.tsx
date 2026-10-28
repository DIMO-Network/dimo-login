import React, { useEffect, useRef, useState } from 'react';
import debounce from 'lodash/debounce';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

import { useUIManager } from '../../context/UIManagerContext';
import { sendOtp } from '../../services';
import { useAuthContext } from '../../context/AuthContext';
import { message, translateText, useT, type Message } from '../../i18n';
import { ActionBar, Button, DoneHeader, ErrorBox, Notice, Screen } from '../ui';
import { cn } from '../ui/cn';

const LENGTH = 6;

// Digits only, whatever the keyboard sent: NFKC turns full-width ３ (Japanese
// IMEs) into 3, and anything else is dropped.
export const toDigits = (value: string) => value.normalize('NFKC').replace(/\D/g, '');

interface OtpInputProps {
  email: string;
}

// codeRejected: the code itself was wrong, so the boxes show as invalid; a
// code that couldn't be sent leaves them alone.
type OtpError = { message: Message; detail?: string; codeRejected?: boolean };

export const OtpInput: React.FC<OtpInputProps> = ({ email: emailProp }) => {
  const t = useT();
  const { user, completeOTPLogin } = useAuthContext();
  // The email typed on the sign-in screen, or the account's when that step was
  // skipped (a returning session, the passkey retry screen).
  const email = emailProp || user?.email || '';
  const { setError: setScreenError } = useUIManager();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [otpId, setOtpId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<OtpError | null>(null);
  const [resent, setResent] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const sendOtpCode = async (isResend = false) => {
    setError(null);
    try {
      const result = await sendOtp(user.email);
      if (!result.success) {
        setError({ message: message('otp.error.send'), detail: result.error });
        return;
      }
      setOtpId(result.data.otpId);
      setResent(isResend);
    } catch (err) {
      setError({
        message: message('otp.error.send'),
        detail: err instanceof Error ? err.message : undefined,
      });
    }
  };

  useEffect(() => {
    setScreenError(null);
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
    // eslint-disable-next-line
  }, []);

  const focus = (index: number) => inputs.current[Math.min(index, LENGTH - 1)]?.focus();

  // Typing fills one box and moves on; pasting or autofill fills from here.
  const fillFrom = (index: number, value: string) => {
    const typed = toDigits(value);
    if (!typed) {
      setDigits((current) => current.map((d, i) => (i === index ? '' : d)));
      return;
    }
    setDigits((current) => {
      const next = [...current];
      typed
        .slice(0, LENGTH - index)
        .split('')
        .forEach((d, i) => {
          next[index + i] = d;
        });
      return next;
    });
    setError(null);
    focus(index + typed.length);
  };

  const code = digits.join('');
  const complete = code.length === LENGTH;

  const handleSubmit = async () => {
    if (!complete || verifying) return;
    try {
      setVerifying(true);
      setError(null);
      await completeOTPLogin({ otpId, otpCode: code });
    } catch (err: unknown) {
      setError({
        message: message('otp.error.verify'),
        detail: err instanceof Error ? err.message : undefined,
        codeRejected: true,
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const native = e.nativeEvent as unknown as {
      isComposing?: boolean;
      keyCode?: number;
    };
    if (native.isComposing || native.keyCode === 229) return;
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      setDigits((current) => current.map((d, i) => (i === index - 1 ? '' : d)));
      focus(index - 1);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focus(index - 1);
    } else if (e.key === 'ArrowRight') {
      focus(index + 1);
    }
  };

  const actions = (
    <ActionBar>
      <Button
        fullWidth
        onClick={handleSubmit}
        loading={verifying}
        loadingLabel={t('otp.verifying')}
        disabled={!complete}
      >
        {t('otp.verify')}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <DoneHeader
        tone="ink"
        icon={<EnvelopeIcon className="size-[26px]" />}
        title={t('otp.title')}
      >
        {t('otp.body', { email })}
      </DoneHeader>

      {error && (
        <ErrorBox title={translateText(error.message, t)}>
          {error.detail && (
            <span className="text-label font-normal text-muted">
              {t('common.error_detail', { detail: error.detail })}
            </span>
          )}
        </ErrorBox>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label text-muted">{t('otp.label')}</legend>
        <div className="flex justify-between gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              // Lets the browser or keyboard offer the emailed code.
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              aria-label={t('otp.digit_label', { index: index + 1 })}
              aria-invalid={error?.codeRejected ? true : undefined}
              value={digit}
              onChange={(e) => fillFrom(index, e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
                fillFrom(index, e.clipboardData.getData('text'));
              }}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'h-12 w-full min-w-0 max-w-12 rounded-control border bg-control text-center text-title text-ink outline-none transition-[border-color,box-shadow] focus:border-focus-ring focus:ring-[3px] focus:ring-accent-soft',
                error?.codeRejected ? 'border-negative' : 'border-control-border',
              )}
            />
          ))}
        </div>
      </fieldset>

      {resent && <Notice tone="positive">{t('otp.resent')}</Notice>}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => sendOtpCode(true)}
      >
        {t('otp.resend')}
      </Button>
    </Screen>
  );
};
