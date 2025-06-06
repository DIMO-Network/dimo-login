import React, { useState, useEffect } from 'react';

import { initializeSession } from './services/sessionService';
import { useAuthContext } from './context/AuthContext';
import { useDevCredentials } from './context/DevCredentialsContext';
import { UiStates, useUIManager } from './context/UIManagerContext';
import { getValidationsForState } from './validations';

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
import { useErrorHandler } from './hooks/useErrorHandler';

const App = () => {
  const { setJwt, setUser, setUserInitialized, userInitialized } = useAuthContext();
  const { clientId, invalidCredentials } = useDevCredentials();
  const { uiState, setUiState, isLoading, entryState } = useUIManager() as {
    uiState: keyof typeof componentMap;
    setUiState: (state: UiStates) => void;
    isLoading: boolean;
    entryState: UiStates;
  };
  const [email, setEmail] = useState('');

  const { error } = useErrorHandler({
    entryState,
    invalidCredentials,
    customValidations: getValidationsForState(entryState || ''),
  });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (error) {
    return <ErrorScreen title={error.title} message={error.message} />;
  }

  if (isLoading || !userInitialized) {
    return <LoadingScreen />;
  }

  const componentMap: Record<UiStates, React.ReactNode> = {
    [UiStates.EMAIL_INPUT]: <EmailInput onSubmit={setEmail} />,
    [UiStates.OTP_INPUT]: <OtpInput email={email} />,
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
