import React, { useState, useEffect } from 'react';

import { initializeSession } from './services/sessionService';
import { useAuthContext } from './context/AuthContext';
import { useDevCredentials } from './context/DevCredentialsContext';
import { UiStates } from './enums';
import { useUIManager } from './context/UIManagerContext';
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
import { useErrorHandler } from './hooks/useErrorHandler';
import { PasskeyLogin } from './components/Auth/PasskeyLogin';
import { PasskeyLoginFail } from './components/Auth/PasskeyLoginFail';

import './App.css';

const App = () => {
  const { setJwt, setUser, setUserInitialized, userInitialized } = useAuthContext();
  const { clientId, devLicenseAlias, ...params } = useDevCredentials();
  const { uiState, setUiState, isLoading, entryState } = useUIManager() as {
    uiState: keyof typeof componentMap;
    setUiState: (state: UiStates) => void;
    isLoading: boolean;
    entryState: UiStates;
  };
  const [email, setEmail] = useState('');

  const { error } = useErrorHandler({
    customValidations: getValidationsForState(entryState || ''),
    params: {
      clientId,
      devLicenseAlias,
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
        setUserInitialized,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (error) {
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

  if (isLoading || !userInitialized) {
    return <LoadingScreen />;
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
