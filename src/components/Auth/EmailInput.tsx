import React, { useState } from 'react';
import { captureException } from '@sentry/react';

import { ErrorMessage, Loader, UIManagerLoaderWrapper } from '../Shared';
import { LegalNotice } from '../Shared/LegalNotice';
import SSOButton from '../Shared/SSOButton';
import { AppleIcon, GoogleIcon } from '../Icons';
import { Button, Screen, ScreenHeader, TextField } from '../ui';
import { clearLoggedEmail, getLoggedEmail } from '../../services';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { decodeJwt } from '../../utils/jwtUtils';
import { normalizeEmail, validateEmail } from '../../utils/emailUtils';
import { getRedirectHost } from '../../utils/urlHelpers';
import { AuthProvider, getOAuthRedirectUri } from '../../utils/authUrls';
import { getKeyboardEventListener, getSignInTitle } from '../../utils/uiUtils';
import {
  useOAuthCodeExchange,
  useConstructOAuthUrl,
  useGoToLoginOrSignUp,
} from '../../hooks';
import { message, translateText, useT, type Message } from '../../i18n';

interface EmailInputProps {
  onSubmit: (email: string) => void;
}

const OrDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 text-label font-normal text-muted">
    <span className="h-px flex-1 bg-outline" aria-hidden="true" />
    {label}
    <span className="h-px flex-1 bg-outline" aria-hidden="true" />
  </div>
);

/**
 * Sign in: an email, or Google / Apple. An account used on this device before
 * gets "Continue as …". Nothing is shared with the app here: the email is
 * asked for after sign-in, with the rest of the app's request (see
 * utils/emailRequest.ts).
 */
export const EmailInput: React.FC<EmailInputProps> = ({ onSubmit }) => {
  const t = useT();
  const { clientId, devLicenseAlias, oemBrand, redirectUri } = useDevCredentials();
  const brandName = oemBrand?.name || devLicenseAlias || undefined;
  const appName = brandName || t('common.app_developer_fallback');
  const { error, setError, altTitle, setLoadingState } = useUIManager();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<Message | null>(null);
  const [cachedEmail, setCachedEmail] = useState(() => getLoggedEmail(clientId));
  const constructOAuthUrl = useConstructOAuthUrl();
  const goToLoginOrSignUp = useGoToLoginOrSignUp();

  const handleSuccessfulEmailSubmission = async (email: string) => {
    try {
      // An earlier attempt's error would otherwise follow onto the next screen.
      setError(null);
      setLoadingState(true, message('signin.signing_in'), false);
      onSubmit(email);
      await goToLoginOrSignUp(email);
    } catch (err) {
      captureException(err);
      setError(message('signin.error.details'));
    } finally {
      setLoadingState(false);
    }
  };

  const handleEmailInputSubmit = async () => {
    const emailToUse = normalizeEmail(email || cachedEmail || '');
    const validationError = validateEmail(emailToUse);
    if (validationError) {
      return setFieldError(validationError);
    }
    await handleSuccessfulEmailSubmission(emailToUse);
  };

  const handleSwitchAccount = () => {
    clearLoggedEmail(clientId);
    setCachedEmail(null);
    setEmail('');
  };

  const handleProviderAuth = (provider: AuthProvider) => {
    window.location.href = constructOAuthUrl(provider);
  };

  const handleToken = async (token: string) => {
    const decodedJwt = decodeJwt(token);
    if (!decodedJwt?.email) {
      return setError(message('signin.error.no_email'));
    }
    setEmail(decodedJwt.email);
    await handleSuccessfulEmailSubmission(decodedJwt.email);
  };

  const { isExchanging } = useOAuthCodeExchange({
    clientId: 'login-with-dimo',
    redirectUri: getOAuthRedirectUri(),
    onSuccess: (token) => handleToken(token),
    onFailure: (reason) => {
      // The provider's reason is for developers; the user gets what to do.
      console.error('OAuth code exchange failed:', reason);
      setError(message('signin.error.oauth'));
    },
  });

  if (isExchanging) {
    return <Loader message={message('signin.signing_in')} />;
  }

  const returning = !!cachedEmail;
  const title = returning
    ? t('signin.returning_title')
    : getSignInTitle(devLicenseAlias, {
        altTitle: Boolean(altTitle),
        brandName: oemBrand?.name ?? null,
      });
  // The default title names DIMO; this line names the app it leads to.
  const showSubtitle = returning || (!altTitle && !oemBrand?.name);

  return (
    <UIManagerLoaderWrapper>
      <Screen>
        <ScreenHeader
          title={title}
          subtitle={showSubtitle ? t('signin.subtitle', { appName }) : undefined}
          host={getRedirectHost(redirectUri)}
        />
        {error && <ErrorMessage message={error} />}

        {returning ? (
          <div className="flex items-center gap-3 rounded-card bg-card px-3.5 py-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-control bg-highest text-body-sm font-semibold uppercase text-ink"
            >
              {cachedEmail.charAt(0)}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-body-sm font-medium text-ink">
                {cachedEmail}
              </span>
              <span className="text-label font-normal text-muted">
                {t('signin.returning_desc')}
              </span>
            </span>
          </div>
        ) : (
          <TextField
            label={t('signin.email_label')}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t('signin.email_placeholder')}
            value={email}
            onValueChange={(value) => {
              setEmail(value);
              setFieldError(null);
            }}
            onKeyDown={getKeyboardEventListener('Enter', handleEmailInputSubmit)}
            error={fieldError ? translateText(fieldError, t) : undefined}
          />
        )}

        {returning ? (
          <div className="flex flex-col gap-2">
            <Button fullWidth onClick={handleEmailInputSubmit}>
              <span className="min-w-0 truncate">
                {t('signin.continue_as', { email: cachedEmail })}
              </span>
            </Button>
            <Button variant="ghost" fullWidth onClick={handleSwitchAccount}>
              {t('signin.other_account')}
            </Button>
          </div>
        ) : (
          <>
            <Button fullWidth onClick={handleEmailInputSubmit}>
              {t('signin.continue')}
            </Button>
            <OrDivider label={t('signin.or')} />
            <div className="flex flex-col gap-2">
              <SSOButton
                onClick={() => handleProviderAuth(AuthProvider.GOOGLE)}
                icon={<GoogleIcon />}
                text={t('signin.google')}
              />
              <SSOButton
                onClick={() => handleProviderAuth(AuthProvider.APPLE)}
                icon={<AppleIcon />}
                text={t('signin.apple')}
              />
            </div>
          </>
        )}

        <LegalNotice />
      </Screen>
    </UIManagerLoaderWrapper>
  );
};
