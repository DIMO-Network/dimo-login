import React, { useEffect, useRef, useState } from 'react';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import { useSignUp } from '../../hooks/useSignUp';
import { message, useT } from '../../i18n';
import ErrorMessage from '../Shared/ErrorMessage';
import { ActionBar, Button, DoneHeader, Notice, Screen } from '../ui';
import { CodeBoxes } from './CodeBoxes';

const LENGTH = 6;
export const RESEND_COOLDOWN_MS = 30_000;

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
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  // The first code went out just before this screen opened.
  const [cooling, setCooling] = useState(true);
  const [sendFailed, setSendFailed] = useState(false);
  const [resent, setResent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const startCooldown = () => {
    clearTimeout(timer.current);
    setCooling(true);
    timer.current = setTimeout(() => setCooling(false), RESEND_COOLDOWN_MS);
  };

  useEffect(() => {
    startCooldown();
    return () => clearTimeout(timer.current);
  }, []);

  if (!signUpDraft) return null;

  const code = digits.join('');
  const complete = code.length === LENGTH;

  const handleContinue = () => {
    if (complete) submitCode(code);
  };

  const handleResend = async () => {
    if (cooling) return;
    startCooldown();
    setSendFailed(false);
    setResent(false);
    setScreenError(null);
    try {
      await resend();
      setResent(true);
    } catch {
      // No code went out, so there is nothing to wait for.
      clearTimeout(timer.current);
      setCooling(false);
      setSendFailed(true);
    }
  };

  const changeDigits = (next: string[]) => {
    if (next.some((d, i) => d && d !== digits[i])) setScreenError(null);
    setDigits(next);
  };

  const shownError = sendFailed ? message('signup.error.send') : screenError;

  return (
    <Screen
      actions={
        <ActionBar>
          <Button fullWidth onClick={handleContinue} disabled={!complete}>
            {t('signup.code_continue')}
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
        invalid={!!screenError && !sendFailed}
        onSubmit={handleContinue}
      />

      {resent && <Notice tone="positive">{t('otp.resent')}</Notice>}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={cooling}
        onClick={handleResend}
      >
        {t('otp.resend')}
      </Button>
    </Screen>
  );
};
