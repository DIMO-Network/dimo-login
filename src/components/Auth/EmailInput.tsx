import React, { useEffect, useRef, useState } from 'react';
import { KeyIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { captureException } from '@sentry/react';

import { ErrorMessage } from '../Shared/ErrorMessage';
import { Loader, UIManagerLoaderWrapper } from '../Shared/Loader';
import { LegalNotice } from '../Shared/LegalNotice';
import SSOButton from '../Shared/SSOButton';
import { AppleIcon, GoogleIcon } from '../Icons';
import { Button, Screen, ScreenHeader, TextField } from '../ui';
import { forgetAccount, getRememberedAccounts } from '../../services/accountStore';
import type { RememberedAccount } from '../../services/accountStore';
import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { UiStates } from '../../enums';
import { loadPasskeyLookup, usePasskeyChallenge } from '../../hooks/usePasskeyChallenge';
import { passkeyFirstEnabled } from '../../utils/featureFlags';
import { isEmbed } from '../../utils/isEmbed';
import { decodeJwt } from '../../utils/jwtUtils';
import { sendErrorToParent } from '../../utils/errorUtils';
import { normalizeEmail, validateEmail } from '../../utils/emailUtils';
import { getRedirectHost } from '../../utils/urlHelpers';
import { AuthProvider, getOAuthRedirectUri } from '../../utils/authUrls';
import { getKeyboardEventListener, getSignInTitle } from '../../utils/uiUtils';
import { useOAuthCodeExchange } from '../../hooks/useOAuthCodeExchange';
import { useConstructOAuthUrl } from '../../hooks/useConstructOAuthUrl';
import { useGoToLoginOrSignUp } from '../../hooks/useGoToLoginOrSignUp';
import { message, translateText, useT, type Message } from '../../i18n';

interface EmailInputProps {
  onSubmit: (email: string) => void;
}

/**
 * The chooser ignores clicks on its accounts this long after it appears, so a
 * popup opened under a rapid click can't take that click as a choice.
 */
export const CHOOSER_ARM_MS = 500;

const isPromptClosed = (error: unknown) =>
  error instanceof DOMException && ['NotAllowedError', 'AbortError'].includes(error.name);

const OrDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 text-label font-normal text-muted">
    <span className="h-px flex-1 bg-outline" aria-hidden="true" />
    {label}
    <span className="h-px flex-1 bg-outline" aria-hidden="true" />
  </div>
);

/**
 * Sign in: an email, or Google / Apple. Accounts used on this device before
 * are offered first, to choose from (or forget, or step past). Nothing is
 * shared with the app here: the email is asked for after sign-in, with the
 * rest of the app's request (see utils/emailRequest.ts). Cancel goes back to
 * the app signed out: it hears an error and gets no token.
 */
export const EmailInput: React.FC<EmailInputProps> = ({ onSubmit }) => {
  const t = useT();
  const { clientId, devLicenseAlias, oemBrand, redirectUri, utm } = useDevCredentials();
  const brandName = oemBrand?.name || devLicenseAlias || undefined;
  const appName = brandName || t('common.app_developer_fallback');
  const { error, setError, altTitle, setLoadingState, setUiState } = useUIManager();
  const [fieldError, setFieldError] = useState<Message | null>(null);
  const {
    resumeAccount,
    accountRequest: { loginHint },
    emailFormIntent,
    clearEmailFormIntent,
    setUser,
    setPasskeyHint,
  } = useAuthContext();
  const [accounts, setAccounts] = useState<RememberedAccount[]>(() =>
    getRememberedAccounts(clientId),
  );
  // The app's hint narrows the chooser to that account when it's remembered
  // (and "Use another account" then means a different one, so an empty field).
  // Otherwise the hint is the email to start from. It never signs anyone in.
  // Both emails are lowercase: the hint is normalised, the stored list too.
  const hintedAccount = loginHint
    ? accounts.find((account) => account.email === loginHint)
    : undefined;
  const [email, setEmail] = useState(loginHint && !hintedAccount ? loginHint : '');
  // "Use my email instead" opens the email form rather than the chooser, once.
  const [otherAccount, setOtherAccount] = useState(
    emailFormIntent || (Boolean(loginHint) && !hintedAccount),
  );
  const armed = useRef(false);
  // Not embedded: the embedding page may not allow the passkey prompt.
  const passkeyFirst =
    passkeyFirstEnabled() && !!window.PublicKeyCredential && !isEmbed();
  // One "Sign in with a passkey" at a time, a double click included.
  const passkeyAttempt = useRef(false);
  const constructOAuthUrl = useConstructOAuthUrl();
  const goToLoginOrSignUp = useGoToLoginOrSignUp();

  useEffect(() => {
    const timer = setTimeout(() => {
      armed.current = true;
    }, CHOOSER_ARM_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (emailFormIntent) clearEmailFormIntent();
  }, [emailFormIntent, clearEmailFormIntent]);

  const handleSuccessfulEmailSubmission = async (email: string, proofToken?: string) => {
    try {
      // An earlier attempt's error would otherwise follow onto the next screen.
      setError(null);
      setLoadingState(true, message('signin.signing_in'), false);
      onSubmit(email);
      await goToLoginOrSignUp(email, proofToken);
    } catch (err) {
      captureException(err);
      setError(message('signin.error.details'));
    } finally {
      setLoadingState(false);
    }
  };

  const handleEmailInputSubmit = async () => {
    const emailToUse = normalizeEmail(email);
    const validationError = validateEmail(emailToUse);
    if (validationError) {
      return setFieldError(validationError);
    }
    await handleSuccessfulEmailSubmission(emailToUse);
  };

  // Only a click on the account signs it in silently. When its session can't
  // be resumed the usual passkey / code step takes over.
  const handleChooseAccount = async (account: RememberedAccount) => {
    if (!armed.current) return;
    // The screens after this one name this account, even if it resumes now and
    // its key runs out later.
    onSubmit(account.email);
    try {
      setError(null);
      setLoadingState(true, message('signin.signing_in'), false);
      if (await resumeAccount(account)) return setLoadingState(false);
    } catch (err) {
      captureException(err);
      setError(message('signin.error.details'));
      return setLoadingState(false);
    }
    await handleSuccessfulEmailSubmission(account.email);
  };

  const handleRemoveAccount = (account: RememberedAccount) => {
    if (!armed.current) return;
    forgetAccount(account.email);
    setAccounts(getRememberedAccounts(clientId));
  };

  // The accounts API names the account only once it has checked the
  // passkey's signature; the usual passkey step then signs in, its prompt
  // pinned to that passkey. With a challenge ready, the prompt opens before
  // anything is awaited; without one it waits for a fetch, and then a refused
  // prompt may be the browser's doing (Safari wants the click), so it is told.
  // Otherwise a closed prompt says nothing.
  const handlePasskeySignIn = async () => {
    if (passkeyAttempt.current) return;
    passkeyAttempt.current = true;
    setError(null);
    const ready = passkeyChallenge.take();
    let found = false;
    // Only the prompt's own refusal can be a person closing it; an aborted
    // request (a time limit) is a failure like any other.
    let prompting = false;
    try {
      const lookup = ready?.lookup ?? (await loadPasskeyLookup());
      const challenge =
        ready?.challenge ?? (await lookup.fetchPasskeyChallenge()).challenge;
      prompting = true;
      const assertion = await lookup.getPasskeyAssertion(challenge);
      prompting = false;
      setLoadingState(true, message('signin.signing_in'), false);
      const account = await lookup.findAccountByPasskey(challenge, assertion);
      if (!account) return setError(message('signin.error.passkey_unknown'));
      found = true;
      setUser(account);
      setPasskeyHint({
        credentialId: assertion.id,
        subOrganizationId: account.subOrganizationId,
      });
      onSubmit(account.email);
      setUiState(UiStates.PASSKEY_LOGIN);
    } catch (err) {
      const closed = prompting && isPromptClosed(err);
      if (closed && ready) return;
      if (!closed) captureException(err);
      setError(message('signin.error.passkey'));
    } finally {
      passkeyAttempt.current = false;
      setLoadingState(false);
      // Still on the form: ready for another try.
      if (!found) passkeyChallenge.prefetch();
    }
  };

  const handleCancel = () =>
    sendErrorToParent('User cancelled sign-in', redirectUri, utm, setUiState);

  const handleProviderAuth = (provider: AuthProvider) => {
    const url = constructOAuthUrl(provider);
    if (!url) return setError(message('signin.error.storage'));
    window.location.href = url;
  };

  const handleToken = async (token: string) => {
    const decodedJwt = decodeJwt(token);
    if (!decodedJwt?.email) {
      return setError(message('signin.error.no_email'));
    }
    // The token is the proof of the email, so only a verified one will do
    // (the server asks for email_verified: true too).
    if (decodedJwt.email_verified !== true) {
      return setError(message('signin.error.email_unverified'));
    }
    setEmail(decodedJwt.email);
    await handleSuccessfulEmailSubmission(decodedJwt.email, token);
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

  const choosing = accounts.length > 0 && !otherAccount;
  // Kept ready while the email form shows.
  const passkeyChallenge = usePasskeyChallenge(
    passkeyFirst && !choosing && !isExchanging,
  );

  if (isExchanging) {
    return <Loader message={message('signin.signing_in')} />;
  }

  const title = choosing
    ? t('signin.choose_title')
    : getSignInTitle(devLicenseAlias, {
        altTitle: Boolean(altTitle),
        brandName: oemBrand?.name ?? null,
      });
  // The default title names DIMO; this line names the app it leads to.
  const showSubtitle = choosing || (!altTitle && !oemBrand?.name);

  return (
    <UIManagerLoaderWrapper>
      <Screen>
        <ScreenHeader
          title={title}
          subtitle={showSubtitle ? t('signin.subtitle', { appName }) : undefined}
          host={getRedirectHost(redirectUri)}
        />
        {error && <ErrorMessage message={error} />}

        {choosing ? (
          <div className="flex flex-col gap-2">
            {(hintedAccount ? [hintedAccount] : accounts).map((account) => (
              <div key={account.email} className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  className="min-w-0 flex-1"
                  onClick={() => handleChooseAccount(account)}
                >
                  <span className="min-w-0 truncate">
                    {t('signin.continue_as', { email: account.email })}
                  </span>
                </Button>
                {/* Named by hidden text, not aria-label: Sentry's click
                    breadcrumbs record aria-label, and this one holds the email. */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveAccount(account)}
                >
                  <XMarkIcon className="size-5" aria-hidden="true" />
                  <span className="sr-only">
                    {t('signin.remove_account', { email: account.email })}
                  </span>
                </Button>
              </div>
            ))}
            <Button variant="ghost" fullWidth onClick={() => setOtherAccount(true)}>
              {t('signin.other_account')}
            </Button>
          </div>
        ) : (
          <>
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
              {passkeyFirst && (
                <SSOButton
                  onClick={handlePasskeySignIn}
                  icon={<KeyIcon className="size-5" aria-hidden="true" />}
                  text={t('signin.passkey')}
                />
              )}
            </div>
            {accounts.length > 0 && (
              <Button variant="ghost" fullWidth onClick={() => setOtherAccount(false)}>
                {t('signin.back_to_accounts')}
              </Button>
            )}
          </>
        )}

        <Button variant="ghost" fullWidth onClick={handleCancel}>
          {t('common.cancel')}
        </Button>

        <LegalNotice />
      </Screen>
    </UIManagerLoaderWrapper>
  );
};
