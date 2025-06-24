import { useEffect, useState } from 'react';
import debounce from 'lodash/debounce';
import { submitCodeExchange } from '../services';
import { captureException } from '@sentry/react';

const getAuthCodeFromSearchParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('code');
};

// TODO - this is being re-run after attempting with an error
// ie if the user logs in with a different account or something
// try to make sure that this doesn't get re-run.
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
      if (!code) {
        return;
      }
      try {
        setIsExchanging(true);
        const accessToken = await submitCodeExchange({
          code,
          clientId,
          redirectUri,
        });
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
