import React, { useState } from 'react';

import { ErrorMessage, Header, LegalNotice, Loader } from '../Shared';
import { CachedEmail, EmailInputForm } from './';
import { getLoggedEmail, setEmailGranted } from '../../services';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { decodeJwt } from '../../utils/jwtUtils';
import { validateEmail } from '../../utils/emailUtils';
import { getForceEmail } from '../../stores/AuthStateStore';
import { getAppUrl } from '../../utils/urlHelpers';
import { AuthProvider, getOAuthRedirectUri } from '../../utils/authUrls';
import { getKeyboardEventListener, getSignInTitle } from '../../utils/uiUtils';
import {
  useOAuthCodeExchange,
  useConstructOAuthUrl,
  useGoToLoginOrSignUp,
} from '../../hooks';
import { EmailPermissionCheckbox } from './EmailPermissionCheckbox';

interface EmailInputProps {
  onSubmit: (email: string) => void;
}

export const EmailInput: React.FC<EmailInputProps> = ({ onSubmit }) => {
  const { clientId, devLicenseAlias } = useDevCredentials();
  const { error, setError, altTitle } = useUIManager();
  const [email, setEmail] = useState('');
  const [emailPermissionGranted, setEmailPermissionGranted] = useState(false);
  const [showInput, setShowInput] = useState(!getLoggedEmail(clientId));
  const forceEmail = getForceEmail();
  const appUrl = getAppUrl();
  const constructOAuthUrl = useConstructOAuthUrl();
  const goToLoginOrSignUp = useGoToLoginOrSignUp();

  const handleSuccessfulEmailSubmission = async (email: string) => {
    onSubmit(email);
    goToLoginOrSignUp(email);
  };

  const handleEmailInputSubmit = async () => {
    const emailToUse = String(email || getLoggedEmail(clientId));
    const validationError = validateEmail({
      email: emailToUse,
      emailPermissionGranted,
      forceEmail,
    });
    if (validationError) {
      return setError(validationError);
    }
    setEmailGranted(clientId, emailPermissionGranted);
    await handleSuccessfulEmailSubmission(emailToUse);
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
    await handleSuccessfulEmailSubmission(decodedJwt.email);
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
