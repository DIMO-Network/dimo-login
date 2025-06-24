import React, { useCallback, useState } from 'react';

import { ErrorMessage, Header, LegalNotice, Loader } from '../Shared';
import { CachedEmail, EmailInputForm } from './';
import { fetchUserDetails, getLoggedEmail, setEmailGranted } from '../../services';
import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { decodeJwt } from '../../utils/jwtUtils';
import { isValidEmail } from '../../utils/emailUtils';
import { getForceEmail } from '../../stores/AuthStateStore';
import { getAppUrl } from '../../utils/urlHelpers';
import { AuthProvider, getOAuthRedirectUri } from '../../utils/authUrls';
import { getKeyboardEventListener, getSignInTitle } from '../../utils/uiUtils';
import { useOAuthCodeExchange } from '../../hooks';
import { useConstructOAuthUrl } from '../hooks/useConstructOAuthUrl';
import { EmailPermissionCheckbox } from './EmailPermissionCheckbox';

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
      <EmailPermissionCheckbox
        isChecked={emailPermissionGranted}
        onChange={() => setEmailPermissionGranted((curIsGranted) => !curIsGranted)}
        devLicenseAlias={devLicenseAlias}
      />
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
