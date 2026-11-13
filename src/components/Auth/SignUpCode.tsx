import React, { useEffect, useState } from 'react';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import { useSignUp } from '../../hooks/useSignUp';
import { message, useT, type Text } from '../../i18n';
import { ErrorMessage } from '../Shared/ErrorMessage';
import { ActionBar, Button, DoneHeader, Notice, Screen } from '../ui';
import { CODE_LENGTH, CodeBoxes, hasNewDigit } from './CodeBoxes';

export const RESEND_COOLDOWN_MS = 30_000;

const noDigits = () => Array<string>(CODE_LENGTH).fill('');

/** True until RESEND_COOLDOWN_MS after `sentAt`, the latest send. */
const useResendCooldown = (sentAt: number): boolean => {
  // The send whose wait is over; a newer send starts a new wait.
  const [waited, setWaited] = useState(() =>
    Date.now() >= sentAt + RESEND_COOLDOWN_MS ? sentAt : null,
  );
  useEffect(() => {
    const timer = setTimeout(
      () => setWaited(sentAt),
      sentAt + RESEND_COOLDOWN_MS - Date.now(),
    );
    return () => clearTimeout(timer);
  }, [sentAt]);
  return waited !== sentAt;
};

// Only the error a rejected code comes back with marks the boxes.
const isRejectedCode = (error: Text | null) =>
  typeof error === 'object' && error?.key === 'signup.error.code';

/**
 * The first step of creating an account: type the 6-digit code emailed to the
 * address. The code is checked later, with the passkey, so Continue only
 * hands it on.
 */
export const SignUpCode: React.FC = () => {
  const t = useT();
  const { signUpDraft } = useAuthContext();
  const { error: screenError, setError: setScreenError } = useUIManager();
  const { submitCode, resend } = useSignUp();
  const [digits, setDigits] = useState<string[]>(noDigits);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sent' | 'failed'>('idle');
  const cooling = useResendCooldown(
    signUpDraft?.kind === 'code' ? signUpDraft.sentAt : 0,
  );

  if (signUpDraft?.kind !== 'code') return null;

  const code = digits.join('');
  // Held while a new code is on its way: the one typed is about to stop working.
  const canContinue = code.length === CODE_LENGTH && !resending;

  const handleContinue = () => {
    if (canContinue) submitCode(code);
  };

  const handleResend = async () => {
    if (cooling || resending) return;
    setResending(true);
    setStatus('idle');
    setScreenError(null);
    try {
      await resend();
      setDigits(noDigits());
      setStatus('sent');
    } catch {
      setStatus('failed');
    } finally {
      setResending(false);
    }
  };

  const changeDigits = (next: string[]) => {
    if (hasNewDigit(digits, next)) setScreenError(null);
    setDigits(next);
  };

  const shownError = status === 'failed' ? message('otp.error.send') : screenError;

  return (
    <Screen
      actions={
        <ActionBar>
          <Button fullWidth onClick={handleContinue} disabled={!canContinue}>
            {t('common.continue')}
          </Button>
        </ActionBar>
      }
    >
      <DoneHeader
        tone="ink"
        icon={<EnvelopeIcon className="size-[26px]" />}
        title={t('signup.code_title')}
      >
        {t('signup.code_body', { email: signUpDraft.email })}
      </DoneHeader>

      {shownError && <ErrorMessage message={shownError} />}

      <CodeBoxes
        digits={digits}
        onDigitsChange={changeDigits}
        invalid={isRejectedCode(screenError)}
        onSubmit={handleContinue}
      />

      {status === 'sent' && <Notice tone="positive">{t('otp.resent')}</Notice>}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={cooling || resending}
        onClick={handleResend}
      >
        {t('otp.resend')}
      </Button>
    </Screen>
  );
};
