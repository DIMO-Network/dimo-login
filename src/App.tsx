import React, { useState, useEffect } from 'react';

import { initializeSession } from './services/sessionService';
import { useAuthContext } from './context/AuthContext';
import { useDevCredentials } from './context/DevCredentialsContext';
import { UiStates } from './enums';
import { useUIManager } from './context/UIManagerContext';
import { getValidationsForState } from './validations';

import {
  AccountManager,
  AccountPermissionsSuccess,
  AdvancedTransaction,
  CancelledTransaction,
  EmailInput,
  ErrorScreen,
  LoadingScreen,
  OtpInput,
  PasskeyGeneration,
  SignMessage,
  SuccessfulPermissions,
  SuccessfulTransaction,
  SuccessPage,
  VehicleManager,
  ManageVehicle,
  MintVehicle,
  AddVehicle,
  CompatibilityCheck,
  ConnectDevice,
  ConnectTesla,
  Logout,
} from './components';
import { Card } from './components/Shared/Card';
import { useErrorHandler } from './hooks/useErrorHandler';
import { PasskeyLogin } from './components/Auth/PasskeyLogin';
import { PasskeyLoginFail } from './components/Auth/PasskeyLoginFail';
import { readableTextOn } from './utils/colorContrast';

import './App.css';

const DEFAULT_DOCUMENT_TITLE = 'Login with DIMO';

const App = () => {
  const { setJwt, setUser } = useAuthContext();
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

  // Bind document.title to the OEM brand when one is loaded. Restores the
  // default DIMO title if the popup unmounts (covers in-flight branding
  // changes without leaking previous OEM names across mounts).
  useEffect(() => {
    if (oemBrand?.name) {
      document.title = `Sign in with ${oemBrand.name}`;
    } else {
      document.title = DEFAULT_DOCUMENT_TITLE;
    }
    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    };
  }, [oemBrand?.name]);

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

  useEffect(() => {
    if (clientId) {
      initializeSession({
        clientId,
        setJwt,
        setUser,
        uiState,
        setUiState,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, incomingEntryState]);

  if (isLoading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  if (error && !isLoading) {
    return (
      <ErrorScreen
        title={error.title}
        message={error.message.replace(
          '<license_alias>',
          devLicenseAlias || 'the application developer',
        )}
      />
    );
  }

  const componentMap: Record<UiStates, React.ReactNode> = {
    [UiStates.EMAIL_INPUT]: <EmailInput onSubmit={setEmail} />,
    [UiStates.PASSKEY_LOGIN]: <PasskeyLogin />,
    [UiStates.OTP_INPUT]: <OtpInput email={email} />,
    [UiStates.PASSKEY_LOGIN_FAIL]: <PasskeyLoginFail email={email} />,
    [UiStates.PASSKEY_GENERATOR]: <PasskeyGeneration email={email} />,
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
    [UiStates.LOGOUT]: <Logout />,
  };

  // Expose the OEM brand color (and a readable text color computed from it)
  // as CSS custom properties on the popup root. PrimaryButton + focus-ring
  // styles read from these vars and fall back to DIMO defaults when null.
  // Setting the vars in one place avoids threading brand props through every
  // component that needs to recolor.
  const brandColor = oemBrand?.primaryColor ?? null;
  const brandStyle = brandColor
    ? ({
        ['--popup-brand-color' as string]: brandColor,
        ['--popup-brand-text' as string]: readableTextOn(brandColor),
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className="flex h-screen pt-2 items-center justify-center bg-white md:bg-[#F7F7F7]"
      style={brandStyle}
    >
      <Card
        width="w-full max-w-[600px]"
        height="min-h-[308px]"
        className="flex flex-col gap-6 items-center p-6"
      >
        <div className="w-full md:w-[440px]">{componentMap[uiState] || null}</div>
      </Card>
    </div>
  );
};

export default App;
