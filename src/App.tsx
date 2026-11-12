import React, { Suspense, useState, useEffect, useRef } from 'react';

import { initializeSession } from './services/sessionService';
import { loadSignInSteps } from './services/walletLoader';
import { handlePostAuthUIState } from './utils/authUtils';
import { isEmbed } from './utils/isEmbed';
import { onIdle } from './utils/onIdle';
import { useAuthContext } from './context/AuthContext';
import { useDevCredentials } from './context/DevCredentialsContext';
import { UiStates } from './enums';
import { useUIManager } from './context/UIManagerContext';
import { getValidationsForState } from './validations';

import { EmailInput } from './components/Auth/EmailInput';
import { ErrorScreen } from './components/Shared/ErrorScreen';
import { LoadingScreen } from './components/Shared/LoadingScreen';
import { AppShell } from './components/Shell/AppShell';
import { FocusScreenHeading } from './components/Shell/FocusScreenHeading';
import { ScreenErrorBoundary } from './components/Shell/ScreenErrorBoundary';
import {
  AccountManager,
  AccountPermissionsSuccess,
  AddVehicle,
  AdvancedTransaction,
  CancelledTransaction,
  CompatibilityCheck,
  ConnectDevice,
  ConnectedApps,
  ConnectTesla,
  EmailConsent,
  Logout,
  ManageVehicle,
  MintVehicle,
  OtpInput,
  PasskeyGeneration,
  PasskeyLogin,
  PasskeyLoginFail,
  preloadScreens,
  ProvisionDeveloperLicense,
  RelayEmailNotice,
  SIGN_IN_STATES,
  SignMessage,
  SignUpCode,
  SuccessfulPermissions,
  SuccessfulTransaction,
  SuccessPage,
  VehicleManager,
} from './screens';
import { useErrorHandler } from './hooks/useErrorHandler';
import { useInitialLanguagePending, useLanguage, useT } from './i18n';
import { useLanguageSync } from './i18n/useLanguageSync';

const App = () => {
  const { setJwt, setUser, accountRequest } = useAuthContext();
  const {
    clientId,
    devLicenseAlias,
    oemBrand,
    entryState: incomingEntryState,
    loadingState: { isLoading, message: loadingMessage },
    ...params
  } = useDevCredentials();
  const { uiState, setUiState, entryState } = useUIManager();
  const [email, setEmail] = useState('');
  const firstScreen = useRef<object | null>(null);
  const t = useT();
  const language = useLanguage();

  const languageSyncLoading = useLanguageSync(
    clientId,
    params.language,
    params.waitingForParams,
  );
  // A language is still loading: the detected one, or the one the app chose.
  const languageLoading = useInitialLanguagePending() || languageSyncLoading;

  // Bind document.title to the OEM brand when one is loaded. Restores the
  // default DIMO title if the popup unmounts (covers in-flight branding
  // changes without leaking previous OEM names across mounts).
  useEffect(() => {
    const defaultTitle = t('app.document_title');
    document.title = oemBrand?.name
      ? t('app.document_title_brand', { name: oemBrand.name })
      : defaultTitle;
    return () => {
      document.title = defaultTitle;
    };
  }, [oemBrand?.name, language, t]);

  const { error } = useErrorHandler({
    customValidations: getValidationsForState(entryState || ''),
    params: {
      clientId,
      devLicenseAlias,
      oemBrand,
      entryState: incomingEntryState,
      ...params,
    },
  });

  // Nothing from a stored session is shown or sent until the request is known
  // to be the app's own (validateCredentials): embedded, a returning session
  // posts the login right away.
  const credentialsChecked =
    !params.waitingForDevLicense &&
    !params.invalidCredentials &&
    !params.credentialsUnavailable;

  useEffect(() => {
    if (clientId && credentialsChecked) {
      initializeSession({
        clientId,
        setJwt,
        setUser,
        uiState,
        setUiState,
        entryState: incomingEntryState as UiStates,
        // Spent once someone has signed in on this page, so a re-run (a
        // changed entry state, say) keeps that sign-in rather than ask again.
        prompt: accountRequest.prompt,
        loginHint: accountRequest.loginHint,
        // Embedded, the done screen has no Back to send the login with, so a
        // returning session goes on as a fresh sign-in does.
        onReturningLogin: isEmbed()
          ? (token, user) =>
              handlePostAuthUIState({
                entryState: UiStates.EMAIL_INPUT,
                clientId,
                jwt: token,
                user,
                redirectUri: params.redirectUri,
                utm: params.utm,
                setUiState,
              })
          : undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, incomingEntryState, credentialsChecked]);

  // Once the app's credentials check out, load the screens a sign-in passes
  // through (and the one the app asked for) and the wallet stack while the
  // person types their email. A preload that fails is retried by the screen
  // or sign-in step that needs it, so its failure is ignored here.
  useEffect(
    () =>
      credentialsChecked
        ? onIdle(() => {
            preloadScreens([...SIGN_IN_STATES, entryState as UiStates]);
            loadSignInSteps().catch(() => {});
          })
        : undefined,
    [credentialsChecked, entryState],
  );

  // The first screen waits, up to LANGUAGE_WAIT_MS, for the copy of the
  // language it will show, so it isn't shown in another one first. Until that
  // copy is in, and before the app's settings (which may name a language) have
  // arrived, the loading screen shows no text and no language switcher.
  if (isLoading || languageLoading) {
    const languageUnknown = languageLoading || params.waitingForParams;
    return (
      <AppShell loading languageLoading={languageUnknown}>
        <LoadingScreen message={languageUnknown ? undefined : loadingMessage} />
      </AppShell>
    );
  }

  if (error && !isLoading) {
    return (
      <AppShell>
        <ErrorScreen
          title={error.title}
          message={{
            ...error.message,
            params: {
              appName: devLicenseAlias || t('common.app_developer_fallback'),
              ...error.message.params,
            },
          }}
        />
      </AppShell>
    );
  }

  const componentMap: Record<UiStates, React.ReactNode> = {
    [UiStates.EMAIL_INPUT]: <EmailInput onSubmit={setEmail} />,
    [UiStates.PASSKEY_LOGIN]: <PasskeyLogin email={email} />,
    [UiStates.OTP_INPUT]: <OtpInput email={email} />,
    [UiStates.PASSKEY_LOGIN_FAIL]: <PasskeyLoginFail email={email} />,
    [UiStates.PASSKEY_GENERATOR]: <PasskeyGeneration />,
    [UiStates.SIGNUP_VERIFY_EMAIL]: <SignUpCode />,
    [UiStates.SIGNUP_RELAY_NOTICE]: <RelayEmailNotice />,
    [UiStates.VEHICLE_MANAGER]: <VehicleManager />,
    [UiStates.MANAGE_VEHICLE]: <ManageVehicle />,
    [UiStates.ADVANCED_TRANSACTION]: <AdvancedTransaction />,
    [UiStates.SIGN_MESSAGE]: <SignMessage />,
    [UiStates.TRANSACTION_SUCCESS]: <SuccessfulTransaction />,
    [UiStates.VEHICLES_SHARED_SUCCESS]: <SuccessfulPermissions />,
    [UiStates.ACCOUNT_MANAGER]: <AccountManager />,
    [UiStates.ACCOUNT_PERMISSIONS_SUCCESS]: <AccountPermissionsSuccess />,
    [UiStates.ADD_VEHICLE]: <AddVehicle />,
    [UiStates.COMPATIBILITY_CHECK]: <CompatibilityCheck />,
    [UiStates.MINT_VEHICLE]: <MintVehicle />,
    [UiStates.CONNECT_DEVICE]: <ConnectDevice />,
    [UiStates.CONNECT_TESLA]: <ConnectTesla />,
    [UiStates.TRANSACTION_CANCELLED]: <CancelledTransaction />,
    [UiStates.SUCCESS]: <SuccessPage />,
    [UiStates.EMAIL_CONSENT]: <EmailConsent />,
    [UiStates.LOGOUT]: <Logout />,
    [UiStates.PROVISION_DEVELOPER_LICENSE]: <ProvisionDeveloperLicense />,
    [UiStates.CONNECTED_APPS]: <ConnectedApps />,
  };

  return (
    <AppShell>
      {/* Keyed by the screen, so Back recovers from one that failed. */}
      <ScreenErrorBoundary key={uiState} firstScreen={firstScreen}>
        <Suspense fallback={<LoadingScreen />}>
          {componentMap[uiState] || null}
          <FocusScreenHeading firstScreen={firstScreen} />
        </Suspense>
      </ScreenErrorBoundary>
    </AppShell>
  );
};

export default App;
