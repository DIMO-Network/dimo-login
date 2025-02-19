import React, { useState, useEffect } from 'react';

import { initializeSession } from './services/sessionService';
import { PasskeyGeneration } from './components/Auth/PasskeyGeneration';
import { useAuthContext } from '@context/AuthContext';
import { useDevCredentials } from './context/DevCredentialsContext'; // Import DevCredentialsContext
import { useUIManager } from './context/UIManagerContext';

import AdvancedTransaction from './components/AdvancedTransaction/AdvancedTransaction';
import CancelledTransaction from './components/AdvancedTransaction/CancelledTransaction';
import EmailInput from './components/Auth/EmailInput';
import ErrorScreen from './components/Shared/ErrorScreen';
import LoadingScreen from './components/Shared/LoadingScreen';
import OtpInput from './components/Auth/OtpInput';
import SuccessfulPermissions from './components/Vehicles/SuccessfulPermissions';
import SuccessfulTransaction from './components/AdvancedTransaction/SuccessfulTransaction';
import SuccessPage from './components/Auth/SuccessPage';
import VehicleManager from './components/Vehicles/VehicleManager';
import ManageVehicle from './components/Vehicles/ManageVehicle';

import './App.css';
import { UiStates } from '@context/types/UIManagerContext';

const App = () => {
  const { setJwt, setUser, setUserInitialized, userInitialized } =
    useAuthContext(); // Get loading state from AuthContext
  const { clientId, apiKey, redirectUri, invalidCredentials } =
    useDevCredentials(); // Get loading state and credentials from DevCredentialsContext
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

  // If either credentials or auth is loading, show the loader

  // Loading state
  if (isLoading || !userInitialized) {
    return <LoadingScreen />;
  }
  // Error screens
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
      {uiState === UiStates.PASSKEY_GENERATOR && (
        <PasskeyGeneration email={email} />
      )}
      {uiState === UiStates.VEHICLE_MANAGER && <VehicleManager />}
      {uiState === UiStates.MANAGE_VEHICLE && <ManageVehicle />}
      {uiState === UiStates.ADVANCED_TRANSACTION && <AdvancedTransaction />}
      {uiState === UiStates.TRANSACTION_SUCCESS && <SuccessfulTransaction />}
      {uiState === UiStates.VEHICLES_SHARED_SUCCESS && (
        <SuccessfulPermissions />
      )}
      {uiState === UiStates.TRANSACTION_CANCELLED && <CancelledTransaction />}
      {uiState === UiStates.SUCCESS && <SuccessPage />}
    </div>
  );
};

export default App;
