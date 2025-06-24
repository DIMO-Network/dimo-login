import { useEffect, useState } from 'react';
import debounce from 'lodash/debounce';
import { submitCodeExchange } from '../services';
import { captureException } from '@sentry/react';

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
  const [isExchanging, setIsExchanging] = useState(false);

  useEffect(() => {
    const callback = debounce(() => {
      const authCode = getAuthCodeFromSearchParams();
      if (!authCode) return;
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
      if (!code || isCodeUsed(code)) {
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
    handleCodeExchange();
  }, [code]);

  return {
    isExchanging,
  };
};
