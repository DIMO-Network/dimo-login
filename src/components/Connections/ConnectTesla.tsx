import { useEffect, useState, type FC } from 'react';

import {
  PrimaryButton,
  Header,
  PermissionsStep,
  VirtualKeyStep,
  PollingVirtualKeyStep,
  MintingStep,
} from '../Shared';
import { AuthProvider } from '../../utils/authUrls';
import { UiStates, useUIManager } from '../../context/UIManagerContext';
import { getAppUrl } from '../../utils/urlHelpers';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { constructAuthUrl } from '../../utils/authUrls';
import {
  checkIntegrationInfo,
  createVehicleFromDeviceDefinitionId,
  registerIntegration,
  submitAuthCode,
} from '../../services/dimoDevicesService';
import { useAuthContext } from '../../context/AuthContext';
import { TESLA_INTEGRATION_ID } from '../../utils/constants';
import { TeslaVehicle } from '../../types';

enum TeslaOnboardingStep {
  PERMISSIONS = 'permissions',
  MINTING = 'minting',
  VIRTUAL_KEY = 'virtual-key',
  POLLING_VIRTUAL_KEY = 'polling-virtual-key',
  READY = 'ready',
}

export const ConnectTesla: FC = () => {
  const { componentData, setUiState, setLoadingState, setComponentData } = useUIManager();
  const [step, setStep] = useState<TeslaOnboardingStep>(TeslaOnboardingStep.PERMISSIONS);
  const [vehicleToAdd, setVehicleToAdd] = useState<TeslaVehicle>();
  const { devLicenseAlias, clientId, redirectUri } = useDevCredentials();
  const { jwt } = useAuthContext();
  const appUrl = getAppUrl();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    const stateFromUrl = urlParams.get('state');

    if (!stateFromUrl) return;

    const decodedStateFromUrl = JSON.parse(stateFromUrl);
    setVehicleToAdd(decodedStateFromUrl.vehicleToAdd);

    if (componentData && componentData.permissionsGranted) {
      setStep(TeslaOnboardingStep.VIRTUAL_KEY);
    }

    if (authCode && !(componentData && componentData.permissionsGranted)) {
      handleAuthCode(authCode, decodedStateFromUrl.vehicleToAdd);
    }
  }, []);

  // ✅ Main Tesla onboarding function
  const handleAuthCode = async (
    authCode: string,
    vehicleToAdd: {
      vin: any;
      make: any;
      model: any;
      year: any;
      deviceDefinitionId: any;
      country: any;
    },
  ) => {
    setLoadingState(true, 'Checking Tesla permissions...');

    try {
      //Submit Auth Code, to get authorized vehicles
      const externalVehicles = await submitAuthCode(
        {
          authorizationCode: authCode,
          redirectUri: process.env.REACT_APP_TESLA_REDIRECT_URI as string,
        },
        jwt,
      );

      if (!externalVehicles.success) {
        console.error('Permissions not granted');
        return;
      }

      const selectedVehicle = externalVehicles.data.vehicles.find((vehicle) => {
        if (!vehicleToAdd) return false;

        // Extract expected values from componentData
        const { vin, make, model, year, deviceDefinitionId } = vehicleToAdd;

        // Prioritize VIN if available
        if (vin && vehicle.vin === vin) {
          return true;
        }

        if (deviceDefinitionId && vehicle.definition.id === deviceDefinitionId) {
          return true;
        }

        // Match against make, model, year
        return (
          vehicle.definition.make.toLowerCase() === make.toLowerCase() &&
          vehicle.definition.model.toLowerCase() === model.toLowerCase() &&
          vehicle.definition.year === year
        );
      });

      //Here we're just getting the first vehicle, however we need to be more careful
      const deviceDefinitionId = selectedVehicle?.definition.id;
      const externalId = selectedVehicle?.externalId;

      if (!(deviceDefinitionId && externalId)) {
        console.error('Could not get vehicle');
        return;
      }

      // ✅ Step 2: Create Vehicle
      const createdVehicle = await createVehicleFromDeviceDefinitionId(
        {
          countryCode: vehicleToAdd.country,
          deviceDefinitionId,
        },
        jwt,
      );

      if (!createdVehicle.success) {
        console.error('Failed to create vehicle');
        return;
      }

      const userDeviceId = createdVehicle.data?.userDevice.id;

      setComponentData({
        ...componentData,
        permissionsGranted: true,
        userDeviceID: userDeviceId,
        integrationID: TESLA_INTEGRATION_ID,
      });

      if (!userDeviceId) {
        return;
      }

      // ✅ Step 3: Register Integration
      const registeredIntegration = await registerIntegration(
        {
          userDeviceId,
          integrationId: TESLA_INTEGRATION_ID,
          externalId,
        },
        jwt,
      );

      if (!registeredIntegration.success) {
        console.error('Failed to register integration');
        return;
      }

      // ✅ Step 4: Check Virtual Key Status
      const integrationInfo = await checkIntegrationInfo(
        {
          userDeviceId,
          integrationId: TESLA_INTEGRATION_ID,
        },
        jwt,
      );

      if (!integrationInfo.success) {
        return;
      }

      const virtualKeyStatus = integrationInfo.data.tesla?.virtualKeyStatus;

      if (virtualKeyStatus && ['Paired', 'Incapable'].includes(virtualKeyStatus)) {
        setUiState(UiStates.MINT_VEHICLE);
      } else {
        setLoadingState(false);
      }
    } catch (error) {
      console.error('Error during onboarding:', error);
      setLoadingState(false);
      setStep(TeslaOnboardingStep.PERMISSIONS);
    }
  };

  const handleNextStep = () => {
    if (step === TeslaOnboardingStep.PERMISSIONS) {
      const urlParams = new URLSearchParams(window.location.search);
      const authUrl = constructAuthUrl({
        provider: AuthProvider.TESLA,
        clientId,
        redirectUri,
        entryState: UiStates.CONNECT_TESLA,
        expirationDate: urlParams.get('expirationDate'),
        permissionTemplateId: urlParams.get('permissionTemplateId'),
        permissions: urlParams.get('permissions'),
        utm: urlParams.getAll('utm'),
        vehicleMakes: urlParams.getAll('vehicleMakes'),
        vehicles: urlParams.getAll('vehicles'),
        vehicleToAdd,
      });

      window.location.href = authUrl;
    } else if (step === TeslaOnboardingStep.VIRTUAL_KEY) {
      // Open to Tesla's Virtual Key setup
      window.open(process.env.REACT_APP_TESLA_VIRTUAL_KEY_URL, '_blank');
      setStep(TeslaOnboardingStep.POLLING_VIRTUAL_KEY);
    } else if (step === TeslaOnboardingStep.POLLING_VIRTUAL_KEY) {
      setLoadingState(false);
      setUiState(UiStates.MINT_VEHICLE);
    } else {
      setLoadingState(true, 'Finalizing setup...');
      setTimeout(() => {
        setLoadingState(false);
        setUiState(UiStates.VEHICLE_MANAGER);
      }, 5000);
    }
  };

  const renderStep = (
    step: TeslaOnboardingStep,
    devLicenseAlias: string,
    vehicleToAdd?: TeslaVehicle,
  ) => {
    const stepComponents: Record<TeslaOnboardingStep, JSX.Element> = {
      [TeslaOnboardingStep.PERMISSIONS]: (
        <PermissionsStep devLicenseAlias={devLicenseAlias} />
      ),
      [TeslaOnboardingStep.VIRTUAL_KEY]: (
        <VirtualKeyStep devLicenseAlias={devLicenseAlias} vehicleToAdd={vehicleToAdd} />
      ),
      [TeslaOnboardingStep.POLLING_VIRTUAL_KEY]: <PollingVirtualKeyStep />,
      [TeslaOnboardingStep.MINTING]: <MintingStep devLicenseAlias={devLicenseAlias} />,
      [TeslaOnboardingStep.READY]: <></>,
    };

    return stepComponents[step] || null;
  };

  const DEFAULT_STEP_CONTENT = { title: 'Setup Complete', buttonText: 'Done' };
  const STEP_CONTENT_MAP: Record<
    TeslaOnboardingStep,
    { title: string; buttonText: string }
  > = {
    [TeslaOnboardingStep.PERMISSIONS]: {
      title: 'Authorize your Tesla account',
      buttonText: 'Continue',
    },
    [TeslaOnboardingStep.VIRTUAL_KEY]: {
      title: 'Add Virtual Key',
      buttonText: 'Setup Virtual Key',
    },
    [TeslaOnboardingStep.POLLING_VIRTUAL_KEY]: {
      title: 'Waiting for Virtual Key',
      buttonText: "I've added my Virtual Key!",
    },
    [TeslaOnboardingStep.MINTING]: DEFAULT_STEP_CONTENT,
    [TeslaOnboardingStep.READY]: DEFAULT_STEP_CONTENT,
  };

  return (
    <>
      <Header
        title={STEP_CONTENT_MAP[step].title}
        subtitle={appUrl.hostname}
        link={`${appUrl.protocol}//${appUrl.host}`}
      />

      {renderStep(step, devLicenseAlias, vehicleToAdd)}

      <div className="flex flex-col w-full mt-3">
        <PrimaryButton onClick={handleNextStep} width="w-full py-3">
          {STEP_CONTENT_MAP[step].buttonText}
        </PrimaryButton>
      </div>
    </>
  );
};
