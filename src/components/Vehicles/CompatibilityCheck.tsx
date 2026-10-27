import { useEffect, useState, type FC } from 'react';

import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { getRedirectHost } from '../../utils/urlHelpers';
import { useT } from '../../i18n';
import { ActionBar, Button, Dots, DoneHeader, Screen, ScreenHeader } from '../ui';
import { AuthProvider } from '../../utils/authUrls';
import {
  formatVehicleString,
  getDeviceDefinitionIdFromVin,
} from '../../services/deviceDefinitionsService';
import { useAuthContext } from '../../context/AuthContext';
import { MakeModelYearEntry, makeModelYearMapping } from '../../utils/tablelandUtils';
import { useAppName } from '../../hooks/useAppName';

export const CompatibilityCheck: FC = () => {
  const t = useT();
  const { componentData, goBack, setUiState, setComponentData } = useUIManager();
  const { redirectUri } = useDevCredentials();
  const appName = useAppName();
  const { jwt } = useAuthContext();
  const [isCompatible, setIsCompatible] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [vehicleString, setVehicleString] = useState<string>('');
  const [connectionType, setConnectionType] = useState<AuthProvider>(
    AuthProvider.CONNECT,
  );

  const handleContinue = () => {
    if (connectionType === AuthProvider.TESLA) {
      setUiState(UiStates.CONNECT_TESLA, { setBack: true });
    } else {
      setUiState(UiStates.CONNECT_DEVICE, { setBack: true });
    }
  };

  // Centralized state update function
  const updateCompatibilityState = (
    isCompatible: boolean,
    connectionType: AuthProvider | null = null,
  ) => {
    setIsChecking(false);
    setIsCompatible(isCompatible);
    if (connectionType) {
      setConnectionType(connectionType);
    }
  };

  const fetchDeviceDefinition = async () => {
    try {
      const vin = componentData.vinNumber;
      const country = componentData.country;
      const makeModel = componentData.makeModel;
      const year = componentData.modelYear;

      let result;

      if (vin && country) {
        result = await getDeviceDefinitionIdFromVin({ vin, countryCode: country }, jwt);
      } else if (makeModel && year) {
        const key = `${makeModel} ${year}`;
        const mapping = makeModelYearMapping[key];

        if (!mapping) {
          console.warn('Vehicle not supported in local mapping');
          setVehicleString(key);
          return updateCompatibilityState(false);
        }

        result = buildLocalMappingResponse(key, makeModel, year, mapping);
      } else {
        console.error('Missing required data.');
        return updateCompatibilityState(false);
      }

      processDeviceDefinitionResponse(result);
    } catch (error) {
      console.error('Unexpected error:', error);
      updateCompatibilityState(false);
    }
  };

  const buildLocalMappingResponse = (
    name: string,
    makeModel: string,
    year: number,
    mapping: MakeModelYearEntry,
  ) => {
    const [make, ...modelParts] = makeModel.split(' ');
    return {
      success: true,
      data: {
        id: mapping.id,
        legacy_ksuid: mapping.ksuid,
        name,
        make,
        model: modelParts.join(' '),
        year,
        imageUrl: mapping.imageURI || undefined,
      },
    };
  };

  const processDeviceDefinitionResponse = (result: any) => {
    if (!result.success || !result.data) {
      return updateCompatibilityState(false);
    }

    const data = result.data;

    const isTesla =
      'deviceDefinitionId' in data
        ? data.deviceDefinitionId.includes('tesla')
        : data.make === 'Tesla';

    const displayName = safeFormatVehicleString(data);
    setVehicleString(displayName);

    if (!componentData.vehicleToAdd) {
      setComponentData({
        vehicleToAdd: {
          make: data.make ?? componentData.makeModel.split(' ')[0],
          model: data.model ?? componentData.makeModel.split(' ').slice(1).join(' '),
          year: data.year ?? componentData.modelYear,
          deviceDefinitionId: data.id ?? (data as any).deviceDefinitionId,
          vin: componentData.vinNumber,
          country: componentData.country,
        },
      });
    }

    updateCompatibilityState(true, isTesla ? AuthProvider.TESLA : AuthProvider.CONNECT);
  };

  const safeFormatVehicleString = (data: any): string => {
    try {
      return formatVehicleString(data.deviceDefinitionId);
    } catch {
      return formatVehicleString(`${data.year} ${data.make} ${data.model}`);
    }
  };

  useEffect(() => {
    if (!componentData) {
      setIsCompatible(false);
      return;
    }
    if (!componentData.vehicleToAdd) {
      //We've already fetched the device definition
      fetchDeviceDefinition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentData]);

  // Cancel leaves adding a vehicle altogether: back to the vehicle list.
  const handleCancel = () => setUiState(UiStates.VEHICLE_MANAGER);

  if (isChecking) {
    return (
      <Screen>
        <ScreenHeader title={t('compat.checking')} host={getRedirectHost(redirectUri)} />
        <div className="flex justify-center py-8 text-muted" role="status">
          <Dots />
        </div>
      </Screen>
    );
  }

  const actions = (
    <ActionBar className="[&>div]:flex-col">
      {isCompatible ? (
        <Button fullWidth onClick={handleContinue}>
          {t('compat.add')}
        </Button>
      ) : (
        <Button fullWidth onClick={goBack}>
          {t('compat.try_another')}
        </Button>
      )}
      <Button variant="ghost" fullWidth onClick={handleCancel}>
        {t('common.cancel')}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <DoneHeader
        tone={isCompatible ? 'positive' : 'negative'}
        icon={
          isCompatible ? (
            <CheckCircleIcon className="size-[26px]" />
          ) : (
            <ExclamationTriangleIcon className="size-[26px]" />
          )
        }
        title={
          isCompatible
            ? t('compat.supported', { vehicle: vehicleString })
            : vehicleString
              ? t('compat.unsupported', { vehicle: vehicleString })
              : t('compat.unsupported_generic')
        }
      >
        {isCompatible
          ? t('compat.supported_body', { appName })
          : t('compat.unsupported_body')}
      </DoneHeader>
    </Screen>
  );
};
