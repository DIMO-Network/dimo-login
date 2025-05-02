import React, { useState, useEffect } from 'react';

import { initializeSession } from './services/sessionService';
import { useAuthContext } from './context/AuthContext';
import { useDevCredentials } from './context/DevCredentialsContext'; // Import DevCredentialsContext
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
  ConnectSmartCar,
  Logout,
} from './components';

import './App.css';

const App = () => {
  const { setJwt, setUser, setUserInitialized, userInitialized } = useAuthContext(); // Get loading state from AuthContext
  const { clientId, apiKey, redirectUri, invalidCredentials } = useDevCredentials(); // Get loading state and credentials from DevCredentialsContext
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

  return (
    <div className="flex h-screen pt-2 justify-center bg-white lg-h-screen">
      {uiState === UiStates.EMAIL_INPUT && <EmailInput onSubmit={setEmail} />}
      {uiState === UiStates.OTP_INPUT && <OtpInput email={email} />}
      {uiState === UiStates.PASSKEY_GENERATOR && <PasskeyGeneration email={email} />}
      {uiState === UiStates.VEHICLE_MANAGER && <VehicleManager />}
      {uiState === UiStates.MANAGE_VEHICLE && <ManageVehicle />}
      {uiState === UiStates.ADVANCED_TRANSACTION && <AdvancedTransaction />}
      {uiState === UiStates.TRANSACTION_SUCCESS && <SuccessfulTransaction />}
      {uiState === UiStates.VEHICLES_SHARED_SUCCESS && <SuccessfulPermissions />}

      {uiState === UiStates.ADD_VEHICLE && <AddVehicle />}

      {uiState === UiStates.COMPATIBILITY_CHECK && <CompatibilityCheck />}

      {uiState === UiStates.MINT_VEHICLE && <MintVehicle />}

      {uiState === UiStates.CONNECT_DEVICE && <ConnectDevice />}

      {uiState === UiStates.CONNECT_TESLA && <ConnectTesla />}

      {uiState === UiStates.CONNECT_SMARTCAR && <ConnectSmartCar />}

      {uiState === UiStates.TRANSACTION_CANCELLED && <CancelledTransaction />}
      {uiState === UiStates.SUCCESS && <SuccessPage />}
      {uiState === UiStates.LOGOUT && <Logout />}
    </div>
  );
};

export default App;
