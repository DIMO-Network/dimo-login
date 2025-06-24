import React, { useCallback, useEffect, useState } from 'react';
import debounce from 'lodash/debounce';

import { Checkbox, ErrorMessage, Header, LegalNotice, Loader } from '../Shared';
import { CachedEmail, EmailInputForm } from './';
import {
  fetchUserDetails,
  getLoggedEmail,
  setEmailGranted,
  submitCodeExchange,
} from '../../services';
import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { decodeJwt } from '../../utils/jwtUtils';
import { isValidEmail } from '../../utils/emailUtils';
import { getForceEmail } from '../../stores/AuthStateStore';
import { getAppUrl } from '../../utils/urlHelpers';
import {
  AuthProvider,
  constructAuthUrl,
  getOAuthRedirectUri,
} from '../../utils/authUrls';
import { getKeyboardEventListener, getSignInTitle } from '../../utils/uiUtils';
import { useOracles } from '../../context/OraclesContext';
import { captureException } from '@sentry/react';

interface EmailInputProps {
  onSubmit: (email: string) => void;
}

export const EmailInput: React.FC<EmailInputProps> = ({ onSubmit }) => {
  const { setUser } = useAuthContext();
  const { clientId, devLicenseAlias } = useDevCredentials();
  const { setUiState, error, setError, altTitle } = useUIManager();
  const [email, setEmail] = useState('');
  const [emailPermissionGranted, setEmailPermissionGranted] = useState(false);
  const [showInput, setShowInput] = useState(!getLoggedEmail(clientId));
  const forceEmail = getForceEmail();
  const appUrl = getAppUrl();
  const constructOAuthUrl = useConstructOAuthUrl();

  const processEmailSubmission = useCallback(
    async (email: string) => {
      if (!email || !clientId) return;
      onSubmit(email);
      const userExistsResult = await fetchUserDetails(email);
      if (userExistsResult.success && userExistsResult.data.user) {
        setUser(userExistsResult.data.user);
        setUiState(UiStates.PASSKEY_LOGIN);
        return true;
      }
      setUiState(UiStates.PASSKEY_GENERATOR, { setBack: true });
      return false;
    },
    [clientId, onSubmit, setUiState, setUser],
  );

  const handleEmailInputSubmit = async () => {
    const emailToUse = String(email || getLoggedEmail(clientId));
    if (!emailToUse || !isValidEmail(emailToUse)) {
      setError('Please enter a valid email');
      return;
    }
    if (forceEmail && !emailPermissionGranted) {
      setError('Email sharing is required to proceed. Please check the box.');
      return;
    }
    setEmailGranted(clientId, emailPermissionGranted);
    await processEmailSubmission(emailToUse);
  };

  const handleSwitchAccount = () => {
    setShowInput(true);
    setEmail('');
    setEmailPermissionGranted(false);
  };

  const handleProviderAuth = (provider: AuthProvider) => {
    if (forceEmail && !emailPermissionGranted) {
      setError('Email sharing is required to proceed. Please check the box.');
      return;
    }
    window.location.href = constructOAuthUrl(provider, emailPermissionGranted);
  };

  const handleToken = async (token: string) => {
    const decodedJwt = decodeJwt(token);
    if (!decodedJwt?.email) {
      return setError('No email was found');
    }
    setEmail(decodedJwt.email);
    await processEmailSubmission(decodedJwt.email);
  };

  const { isExchanging } = useOAuthCodeExchange({
    clientId: 'login-with-dimo',
    redirectUri: getOAuthRedirectUri(),
    onSuccess: (token) => handleToken(token),
    onFailure: (error) => setError(error),
  });

  if (isExchanging) {
    return <Loader message={'Logging you in'} />;
  }

  return (
    <>
      <Header
        title={getSignInTitle(devLicenseAlias, {
          altTitle: Boolean(altTitle),
        })}
        subtitle={appUrl.hostname}
        link={`${appUrl.protocol}//${appUrl.host}`}
      />
      {error && <ErrorMessage message={error} />}
      <div className="flex justify-center items-center">
        <label
          htmlFor="share-email"
          className="flex justify-center items-center text-sm mb-4 cursor-pointer"
        >
          <Checkbox
            onChange={() => {
              setEmailPermissionGranted(!emailPermissionGranted);
            }}
            name="share-email"
            id="share-email"
            className="mr-2"
            checked={emailPermissionGranted}
          />
          I agree to share my email with {devLicenseAlias}
        </label>
      </div>
      <div
        onKeyDown={getKeyboardEventListener('Enter', handleEmailInputSubmit)}
        className="frame9 flex flex-col items-center gap-[10px]"
      >
        {showInput ? (
          <EmailInputForm
            email={email}
            onEmailChange={setEmail}
            onContinue={handleEmailInputSubmit}
            onProviderAuth={handleProviderAuth}
          />
        ) : (
          <CachedEmail
            onContinue={handleEmailInputSubmit}
            onSwitchAccount={handleSwitchAccount}
          />
        )}
        <LegalNotice />
      </div>
    </>
  );
};

const getAuthCodeFromSearchParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('code');
};

const useConstructOAuthUrl = () => {
  const { clientId, redirectUri } = useDevCredentials();
  const { onboardingEnabled } = useOracles();
  const { altTitle } = useUIManager();

  return (provider: AuthProvider, emailPermissionGranted: boolean) => {
    const urlParams = new URLSearchParams(window.location.search);
    return constructAuthUrl({
      provider,
      clientId,
      redirectUri,
      entryState: UiStates.EMAIL_INPUT,
      expirationDate: urlParams.get('expirationDate'),
      permissionTemplateId: urlParams.get('permissionTemplateId'),
      utm: urlParams.getAll('utm'),
      vehicleMakes: urlParams.getAll('vehicleMakes'),
      vehicles: urlParams.getAll('vehicles'),
      powertrainTypes: urlParams.getAll('powertrainTypes'),
      onboarding: onboardingEnabled ? ['tesla'] : [], //TODO: Should have full onboarding array here
      altTitle,
      emailPermissionGranted,
    });
  };
};

// TODO - this is being re-run after attempting with an error
// ie if the user logs in with a different account or something
// try to make sure that this doesn't get re-run.
const useOAuthCodeExchange = ({
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

export default EmailInput;
