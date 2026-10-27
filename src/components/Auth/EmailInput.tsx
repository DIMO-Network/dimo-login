import React, { useId, useState } from 'react';
import { captureException } from '@sentry/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

import { ErrorMessage, Loader, UIManagerLoaderWrapper } from '../Shared';
import { EmailShareRow } from '../Shared/EmailShareRow';
import { LegalNotice } from '../Shared/LegalNotice';
import SSOButton from '../Shared/SSOButton';
import { AppleIcon, GoogleIcon } from '../Icons';
import { Button, Screen, ScreenHeader, TextField } from '../ui';
import {
  clearLoggedEmail,
  getLoggedEmail,
  isEmailGranted,
  setEmailGranted,
} from '../../services';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { decodeJwt } from '../../utils/jwtUtils';
import { normalizeEmail, validateEmail } from '../../utils/emailUtils';
import { getForceEmail, takePendingEmailGrant } from '../../stores/AuthStateStore';
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
 * Sign in: an email (or Google / Apple), and whether to share that email
 * with the app. An account used on this device before gets "Continue as …".
 * When the app requires the email (forceEmail), every way in waits for the
 * switch and says why right under it.
 */
export const EmailInput: React.FC<EmailInputProps> = ({ onSubmit }) => {
  const t = useT();
  const { clientId, devLicenseAlias, oemBrand, redirectUri, tosUrl, privacyPolicyUrl } =
    useDevCredentials();
  const brandName = oemBrand?.name || devLicenseAlias || undefined;
  const appName = brandName || t('common.app_developer_fallback');
  const { error, setError, altTitle, setLoadingState } = useUIManager();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<Message | null>(null);
  const [cachedEmail, setCachedEmail] = useState(() => getLoggedEmail(clientId));
  // A returning account starts from the choice it made last time, so
  // "Continue" no longer turns sharing off without asking.
  const [emailPermissionGranted, setEmailPermissionGranted] = useState(() =>
    isEmailGranted(clientId, cachedEmail),
  );
  const forceEmail = getForceEmail();
  const blocked = forceEmail && !emailPermissionGranted;
  const hintId = useId();
  const constructOAuthUrl = useConstructOAuthUrl();
  const goToLoginOrSignUp = useGoToLoginOrSignUp();

  const handleSuccessfulEmailSubmission = async (email: string) => {
    try {
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
    if (blocked) return;
    const emailToUse = normalizeEmail(email || cachedEmail || '');
    const validationError = validateEmail({
      email: emailToUse,
      emailPermissionGranted,
      forceEmail,
    });
    if (validationError) {
      return setFieldError(validationError);
    }
    setEmailGranted(clientId, emailToUse, emailPermissionGranted);
    await handleSuccessfulEmailSubmission(emailToUse);
  };

  const handleSwitchAccount = () => {
    clearLoggedEmail(clientId);
    setCachedEmail(null);
    setEmail('');
    setEmailPermissionGranted(false);
  };

  const handleProviderAuth = (provider: AuthProvider) => {
    if (blocked) return;
    window.location.href = constructOAuthUrl(provider, emailPermissionGranted);
  };

  const handleToken = async (token: string) => {
    const decodedJwt = decodeJwt(token);
    if (!decodedJwt?.email) {
      return setError(message('signin.error.no_email'));
    }
    const pendingGrant = takePendingEmailGrant();
    if (pendingGrant !== undefined) {
      setEmailGranted(clientId, decodedJwt.email, pendingGrant);
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

        <div className="flex flex-col gap-2">
          <EmailShareRow
            appName={appName}
            checked={emailPermissionGranted}
            onChange={(next) => {
              setEmailPermissionGranted(next);
              // Switching it on answers the "required" hint and any old error.
              setError(null);
            }}
            required={forceEmail}
          />
          {blocked && (
            <p
              id={hintId}
              className="flex items-start gap-1.5 text-label font-normal text-muted"
            >
              <InformationCircleIcon
                className="size-4 shrink-0 text-warning"
                aria-hidden="true"
              />
              <span>{t('email.required_hint', { appName })}</span>
            </p>
          )}
        </div>

        {returning ? (
          <div className="flex flex-col gap-2">
            <Button
              fullWidth
              onClick={handleEmailInputSubmit}
              disabled={blocked}
              disabledReasonId={hintId}
            >
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
            <Button
              fullWidth
              onClick={handleEmailInputSubmit}
              disabled={blocked}
              disabledReasonId={hintId}
            >
              {t('signin.continue')}
            </Button>
            <OrDivider label={t('signin.or')} />
            <div className="flex flex-col gap-2">
              <SSOButton
                onClick={() => handleProviderAuth(AuthProvider.GOOGLE)}
                icon={<GoogleIcon />}
                text={t('signin.google')}
                disabled={blocked}
                disabledReasonId={hintId}
              />
              <SSOButton
                onClick={() => handleProviderAuth(AuthProvider.APPLE)}
                icon={<AppleIcon />}
                text={t('signin.apple')}
                disabled={blocked}
                disabledReasonId={hintId}
              />
            </div>
          </>
        )}

        <LegalNotice
          tosUrl={tosUrl}
          privacyPolicyUrl={privacyPolicyUrl}
          brandName={brandName}
          poweredBy={!!oemBrand}
        />
      </Screen>
    </UIManagerLoaderWrapper>
  );
};
