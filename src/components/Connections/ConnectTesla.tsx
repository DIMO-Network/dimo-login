import { useEffect, useState, type FC } from 'react';

import {
  PermissionsStep,
  VirtualKeyStep,
  PollingVirtualKeyStep,
  MintingStep,
  UIManagerLoaderWrapper,
} from '../Shared';
import { ActionBar, Button, Screen, ScreenHeader } from '../ui';
import { message, useT, type TranslationKey } from '../../i18n';
import { AuthProvider } from '../../utils/authUrls';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { getRedirectHost } from '../../utils/urlHelpers';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { constructAuthUrl } from '../../utils/authUrls';
import { buildFlowSnapshot, saveFlowSnapshot } from '../../utils/flowSnapshot';
import { useOracles } from '../../context/OraclesContext';
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
  const t = useT();
  const { componentData, setUiState, setLoadingState, setComponentData, entryState } =
    useUIManager();
  const { onboardingEnabled } = useOracles();
  const [step, setStep] = useState<TeslaOnboardingStep>(TeslaOnboardingStep.PERMISSIONS);
  const [vehicleToAdd, setVehicleToAdd] = useState<TeslaVehicle>();
  const devCredentials = useDevCredentials();
  const { devLicenseAlias, clientId, redirectUri, oemBrand, cloudEvent } = devCredentials;
  const displayName = oemBrand?.name || devLicenseAlias;
  const { jwt } = useAuthContext();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setLoadingState(true, message('tesla.checking'));

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
      // Restores the vehicle-sharing request after Tesla's redirect; the
      // return itself lands on CONNECT_TESLA from `state`.
      const flowRef = saveFlowSnapshot(
        buildFlowSnapshot({ devCredentials, entryState, onboardingEnabled }),
      );
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
        powertrainTypes: urlParams.getAll('powertrainTypes'),
        cloudEvent,
        vehicleToAdd,
        flowRef,
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
      setLoadingState(true, message('tesla.finalizing'));
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

  const DEFAULT_STEP_CONTENT = {
    title: 'tesla.done.title',
    buttonText: 'tesla.done.cta',
  } as const;
  const STEP_CONTENT_MAP: Record<
    TeslaOnboardingStep,
    { title: TranslationKey; buttonText: TranslationKey }
  > = {
    [TeslaOnboardingStep.PERMISSIONS]: {
      title: 'tesla.authorize.title',
      buttonText: 'tesla.authorize.cta',
    },
    [TeslaOnboardingStep.VIRTUAL_KEY]: {
      title: 'tesla.key.title',
      buttonText: 'tesla.key.cta',
    },
    [TeslaOnboardingStep.POLLING_VIRTUAL_KEY]: {
      title: 'tesla.waiting.title',
      buttonText: 'tesla.waiting.cta',
    },
    [TeslaOnboardingStep.MINTING]: DEFAULT_STEP_CONTENT,
    [TeslaOnboardingStep.READY]: DEFAULT_STEP_CONTENT,
  };

  return (
    <UIManagerLoaderWrapper>
      <Screen
        actions={
          <ActionBar>
            <Button fullWidth onClick={handleNextStep}>
              {t(STEP_CONTENT_MAP[step].buttonText)}
            </Button>
          </ActionBar>
        }
      >
        <ScreenHeader
          title={t(STEP_CONTENT_MAP[step].title)}
          host={getRedirectHost(redirectUri)}
        />
        {renderStep(step, displayName, vehicleToAdd)}
      </Screen>
    </UIManagerLoaderWrapper>
  );
};
