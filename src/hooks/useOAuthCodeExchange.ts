import { useEffect, useState } from 'react';
import debounce from 'lodash/debounce';
import { submitCodeExchange } from '../services/authService';
import { captureException } from '@sentry/react';
import { readTrustedOAuthReturn } from '../utils/flowSnapshot';

const USED_CODES_KEY = 'used_oauth_codes';

function getUsedCodes(): string[] {
  const raw = sessionStorage.getItem(USED_CODES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function markCodeAsUsed(code: string) {
  const codes = getUsedCodes();
  if (!codes.includes(code)) {
    codes.push(code);
    sessionStorage.setItem(USED_CODES_KEY, JSON.stringify(codes));
  }
}

function isCodeUsed(code: string): boolean {
  return getUsedCodes().includes(code);
}

const getAuthCodeFromSearchParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('code');
};

/** This page has a code to exchange: unused, from a return this tab started. */
const hasCodeToExchange = () => {
  const code = getAuthCodeFromSearchParams();
  return Boolean(code && !isCodeUsed(code) && readTrustedOAuthReturn());
};

export const useOAuthCodeExchange = ({
  clientId,
  redirectUri,
  onSuccess,
  onFailure,
}: {
  clientId: string;
  redirectUri: string;
  onSuccess: (token: string) => void;
  onFailure: (reason: string) => void;
}) => {
  const [code, setCode] = useState<string | null>(null);
  // Pending from the first render when there's a code to exchange, so the
  // sign-in screen shows its loader, not a form whose click would race the
  // exchange. Every way the exchange ends or is skipped clears it.
  const [isExchanging, setIsExchanging] = useState(hasCodeToExchange);

  useEffect(() => {
    const callback = debounce(() => {
      const authCode = getAuthCodeFromSearchParams();
      if (!authCode) return setIsExchanging(false);
      setCode(authCode);
    }, 500);
    callback();
    return () => {
      callback.cancel();
    };
  }, []);

  const handleFailure = (err: unknown) => {
    let msg = 'Error submitting code exchange';
    if (err instanceof Error) {
      msg = err.message || msg;
    }
    onFailure(msg);
  };

  useEffect(() => {
    const handleCodeExchange = async () => {
      // No code read yet: the wait above is still running.
      if (!code) return;
      if (isCodeUsed(code)) {
        setIsExchanging(false);
        return;
      }
      // Someone else's sign-in link: its code would sign this visitor in to
      // the linker's account (see readTrustedOAuthReturn).
      if (!readTrustedOAuthReturn()) {
        setIsExchanging(false);
        handleFailure(new Error('OAuth return was not started in this tab'));
        return;
      }
      try {
        setIsExchanging(true);
        const accessToken = await submitCodeExchange({
          code,
          clientId,
          redirectUri,
        });
        markCodeAsUsed(code);
        onSuccess(accessToken);
      } catch (err) {
        captureException(err);
        handleFailure(err);
      } finally {
        setIsExchanging(false);
      }
    };
    // eslint-disable-next-line
    handleCodeExchange();
    // eslint-disable-next-line
  }, [code]);

  return {
    isExchanging,
  };
};
