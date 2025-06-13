import React, { useState, useEffect } from 'react';

import { initializeSession } from './services/sessionService';
import { useAuthContext } from './context/AuthContext';
import { useDevCredentials } from './context/DevCredentialsContext';
import { UiStates, useUIManager } from './context/UIManagerContext';

import {
  AdvancedTransaction,
  CancelledTransaction,
  EmailInput,
  ErrorScreen,
  LoadingScreen,
  OtpInput,
  PasskeyGeneration,
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

import './App.css';
import { PasskeyLogin } from './components/Auth/PasskeyLogin';
import { PasskeyLoginFail } from './components/Auth/PasskeyLoginFail';

const App = () => {
  const { setJwt, setUser, setUserInitialized, userInitialized } = useAuthContext();
  const { clientId, apiKey, redirectUri, invalidCredentials } = useDevCredentials();
  const [email, setEmail] = useState('');
  const { uiState, setUiState, isLoading } = useUIManager();

  useEffect(() => {
    if (clientId) {
      initializeSession({
        clientId,
        setJwt,
        setUser,
        uiState,
        setUiState,
        setUserInitialized,
      });
    }
  }, [clientId]);

  if (isLoading || !userInitialized) {
    return <LoadingScreen />;
  }

  if (invalidCredentials) {
    return (
      <ErrorScreen
        title="Invalid App Credentials"
        message="We're sorry, but it looks like there’s an issue with the app's credentials. This may be due to an invalid setup or unregistered access. Please reach out to the app's support team for assistance."
      />
    );
  }

  if (!clientId || !apiKey || !redirectUri) {
    return (
      <ErrorScreen
        title="Missing Credentials"
        message="Please check the configuration and reload the page."
      />
    );
  }

  const componentMap: {
    [key in UiStates]: React.ReactNode;
  } = {
    [UiStates.EMAIL_INPUT]: <EmailInput onSubmit={setEmail} />,
    [UiStates.PASSKEY_LOGIN]: <PasskeyLogin handlePasskeyRejected={() => {}} />,
    [UiStates.OTP_INPUT]: <OtpInput email={email} />,
    [UiStates.PASSKEY_LOGIN_FAIL]: <PasskeyLoginFail email={email} />,
    [UiStates.PASSKEY_GENERATOR]: <PasskeyGeneration email={email} />,
    [UiStates.VEHICLE_MANAGER]: <VehicleManager />,
    [UiStates.MANAGE_VEHICLE]: <ManageVehicle />,
    [UiStates.ADVANCED_TRANSACTION]: <AdvancedTransaction />,
    [UiStates.TRANSACTION_SUCCESS]: <SuccessfulTransaction />,
    [UiStates.VEHICLES_SHARED_SUCCESS]: <SuccessfulPermissions />,
    [UiStates.ADD_VEHICLE]: <AddVehicle />,
    [UiStates.COMPATIBILITY_CHECK]: <CompatibilityCheck />,
    [UiStates.MINT_VEHICLE]: <MintVehicle />,
    [UiStates.CONNECT_DEVICE]: <ConnectDevice />,
    [UiStates.CONNECT_TESLA]: <ConnectTesla />,
    [UiStates.TRANSACTION_CANCELLED]: <CancelledTransaction />,
    [UiStates.SUCCESS]: <SuccessPage />,
    [UiStates.LOGOUT]: <Logout />,
  };

  return (
    <div className="flex h-screen pt-2 items-center justify-center bg-white md:bg-[#F7F7F7]">
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
