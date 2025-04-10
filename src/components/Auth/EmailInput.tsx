import React, { useCallback, useEffect, useState } from 'react';

import { Card } from '../Shared/Card';
import { Checkbox } from '../Shared/Checkbox';
import { fetchUserDetails } from '../../services/accountsService';
import { Header } from '../Shared/Header';
import { PrimaryButton } from '../Shared/PrimaryButton';
import { setEmailGranted } from '../../services/storageService';
import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { UiStates, useUIManager } from '../../context/UIManagerContext';

import ErrorMessage from '../Shared/ErrorMessage';
import { submitCodeExchange } from '../../services/authService';
import { decodeJwt } from '../../utils/jwtUtils';
import LoadingScreen from '../Shared/LoadingScreen';
import { AppleIcon, GoogleIcon } from '../Icons';
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

interface EmailInputProps {
  onSubmit: (email: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ onSubmit }) => {
  const { authenticateUser, setUser } = useAuthContext();
  const { clientId, devLicenseAlias, redirectUri } = useDevCredentials();
  const { setUiState, entryState, error, setError, setComponentData, altTitle } =
    useUIManager();
  const { onboardingEnabled } = useOracles();
  const [email, setEmail] = useState('');
  const [isDoingCodeExchange, setIsDoingCodeExchange] = useState(false);
  const [triggerAuth, setTriggerAuth] = useState(false);
  const [emailPermissionGranted, setEmailPermissionGranted] = useState(false);
  const [tokenExchanged, setTokenExchanged] = useState(false);
  const forceEmail = getForceEmail();
  const appUrl = getAppUrl();

  const processEmailSubmission = async (email: string, caller: string) => {
    if (!email || !clientId) return;
    onSubmit(email);
    const userExistsResult = await fetchUserDetails(email);
    if (userExistsResult.success && userExistsResult.data.user) {
      setUser(userExistsResult.data.user);
      setTriggerAuth(true);
      return true;
    }
    setUiState(UiStates.PASSKEY_GENERATOR, { setBack: true });
    return false;
  };

  const handleEmailInputSubmit = async () => {
    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email');
      return;
    }
    if (forceEmail && !emailPermissionGranted) {
      setError('Email sharing is required to proceed. Please check the box.');
      return;
    }
    setEmailGranted(clientId, emailPermissionGranted);
    await processEmailSubmission(email, 'handleSubmit');
  };

  const handleProviderAuth = (provider: AuthProvider) => {
    if (forceEmail && !emailPermissionGranted) {
      setError('Email sharing is required to proceed. Please check the box.');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    window.location.href = constructAuthUrl({
      provider,
      clientId,
      redirectUri,
      entryState: UiStates.CONNECT_TESLA,
      expirationDate: urlParams.get('expirationDate'),
      permissionTemplateId: urlParams.get('permissionTemplateId'),
      utm: urlParams.getAll('utm'),
      vehicleMakes: urlParams.getAll('vehicleMakes'),
      vehicles: urlParams.getAll('vehicles'),
      powertrainTypes: urlParams.getAll('powertrainTypes'),
      onboarding: onboardingEnabled ? ['tesla'] : [], //TODO: Should have full onboarding array here
      altTitle,
    });
  };

  useEffect(() => {
    // Only authenticate if `user` is set and authentication hasn't been triggered
    if (triggerAuth) {
      authenticateUser(email, 'credentialBundle', entryState);
    }
  }, [triggerAuth]);

  const handleCodeExchangeError = useCallback(
    (errorMsg: string) => {
      setError(`Error doing code exchange: ${errorMsg}`);
      setIsDoingCodeExchange(false);
    },
    [setError],
  );

  const handleCodeExchangeSuccess = useCallback(
    async (email: string) => {
      setTokenExchanged(true);
      setEmail(email);
      setComponentData({ emailValidated: email });
      await processEmailSubmission(email, 'handleEmail');
    },
    [processEmailSubmission, setComponentData],
  );

  const handleOAuthCodeExchange = useCallback(
    async (code: string) => {
      setIsDoingCodeExchange(true);
      try {
        const result = await submitCodeExchange({
          clientId: 'login-with-dimo',
          redirectUri: getOAuthRedirectUri(),
          code,
        });
        if (!result.success) {
          return handleCodeExchangeError(result.error);
        }
        const access_token = result.data.access_token;
        const decodedJwt = decodeJwt(access_token);
        if (!decodedJwt?.email) return handleCodeExchangeError('Failed to decode JWT');
        await handleCodeExchangeSuccess(decodedJwt.email);
      } catch (err: unknown) {
        console.error(err);
        return handleCodeExchangeError((err as Error).message ?? 'unknown error');
      }
    },
    [handleCodeExchangeError, handleCodeExchangeSuccess],
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (!codeFromUrl || isDoingCodeExchange) return;
  }, []);

  // useEffect(() => {
  //   const urlParams = new URLSearchParams(window.location.search);
  //   const codeFromUrl = urlParams.get('code');
  //   if (!codeFromUrl || isDoingCodeExchange) return;
  //   handleOAuthCodeExchange(codeFromUrl);
  // }, [handleOAuthCodeExchange, isDoingCodeExchange]);

  // useEffect(() => {
  //   // const fetchData = async () => {
  //   //   const urlParams = new URLSearchParams(window.location.search);
  //   //   const codeFromUrl = urlParams.get('code');
  //   //   if (codeFromUrl) {
  //   //     setIsDoingCodeExchange(true);
  //   //     try {
  //   //       const result = await submitCodeExchange({
  //   //         clientId: 'login-with-dimo',
  //   //         redirectUri: getOAuthRedirectUri(),
  //   //         code: codeFromUrl,
  //   //       });
  //   //       console.log('RESULT FROM CODE EXCHANGE', result);
  //   //       if (!result.success) {
  //   //         return setError(`Error doing OAuth code exchange: ${result.error}`);
  //   //       }
  //   //       const access_token = result.data.access_token;
  //   //       const decodedJwt = decodeJwt(access_token);
  //   //
  //   //       if (decodedJwt) {
  //   //         setTokenExchanged(true);
  //   //         setEmail(decodedJwt.email);
  //   //         setComponentData({ emailValidated: decodedJwt.email });
  //   //         await processEmailSubmission(email, 'handleEmail');
  //   //       }
  //   //     } catch (error: unknown) {
  //   //       return setError(
  //   //         `Caught error doing OAuth code exchange: ${(error as Error).message ?? 'unknown error'}`,
  //   //       );
  //   //     }
  //   //   } else {
  //   //     setTokenExchanged(true);
  //   //   }
  //   // };
  //
  //   if (!tokenExchanged) {
  //     fetchData();
  //   }
  // }, [tokenExchanged]);

  if (isDoingCodeExchange) {
    return <LoadingScreen />;
  }

  return (
    <Card width="w-full max-w-[600px]" height="h-fit" className="flex flex-col gap-6">
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
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="p-2 border border-gray-300 rounded-md w-full lg:w-[440px]"
        />
        <PrimaryButton onClick={handleEmailInputSubmit} width="w-full lg:w-[440px]">
          Continue
        </PrimaryButton>

        <div className="flex flex-wrap sm:flex-nowrap justify-center gap-3 w-full">
          <button
            onClick={() => handleProviderAuth('google')}
            className="flex items-center justify-center gap-2 w-full sm:max-w-[210px] h-[40px] rounded-full border border-gray-300 bg-white text-black text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          <button
            onClick={() => handleProviderAuth('apple')}
            className="flex items-center justify-center gap-2 w-full sm:max-w-[210px] h-[40px] rounded-full border border-gray-300 bg-white text-black text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <AppleIcon />
            Sign in with Apple
          </button>
        </div>

        <p className="flex flex-wrap justify-center text-center text-xs text-gray-500">
          By continuing you agree to our&nbsp;
          <a
            href="https://dimo.org/legal/privacy-policy"
            className="underline whitespace-nowrap"
          >
            Privacy Policy
          </a>
          &nbsp;and&nbsp;
          <a
            href="https://dimo.org/legal/terms-of-use"
            className="underline whitespace-nowrap"
          >
            Terms of Service
          </a>
        </p>
      </div>
    </Card>
  );
};

export default EmailInput;
