import React, { useEffect, useState } from 'react';
import debounce from 'lodash/debounce';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

import { useUIManager } from '../../context/UIManagerContext';
import { sendOtp } from '../../services/accountsService';
import { useAuthContext } from '../../context/AuthContext';
import { message, translateText, useT, type Message } from '../../i18n';
import { ActionBar, Button, DoneHeader, ErrorBox, Notice, Screen } from '../ui';
import { CodeBoxes } from './CodeBoxes';

export { toDigits } from './CodeBoxes';

const LENGTH = 6;

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

  // Typing a digit (or pasting a code) dismisses the last error.
  const changeDigits = (next: string[]) => {
    if (next.some((d, i) => d && d !== digits[i])) setError(null);
    setDigits(next);
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

      <CodeBoxes
        digits={digits}
        onDigitsChange={changeDigits}
        invalid={!!error?.codeRejected}
        onSubmit={handleSubmit}
      />

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
