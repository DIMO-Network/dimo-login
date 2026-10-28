import { useMemo, useState, type FC } from 'react';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { MakeModelYearTab, VinNumberTab } from '../Shared';
import { getRedirectHost } from '../../utils/urlHelpers';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { supportedMakeModels } from '../../utils/tablelandUtils';
import { DEFAULT_COUNTRY, getCountryOptions } from '../../utils/countries';
import { useLanguage, useT } from '../../i18n';
import { ActionBar, Button, Screen, ScreenHeader, SegmentedControl } from '../ui';

type Tab = 'make-model' | 'vin';

/** Find a vehicle to connect, by make/model/year or by VIN. */
export const AddVehicle: FC = () => {
  const t = useT();
  const language = useLanguage();
  const { setComponentData, setUiState } = useUIManager();
  const { newVehicleSectionDescription, redirectUri } = useDevCredentials();

  const [tab, setTab] = useState<Tab>('make-model');
  const [makeModel, setMakeModel] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [vinNumber, setVinNumber] = useState('');
  // ISO alpha-3, as the device-definition lookup takes it.
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const countryOptions = useMemo(() => getCountryOptions(language), [language]);

  const handleSubmit = () => {
    setComponentData({ makeModel, modelYear, vinNumber, country });
    setUiState(UiStates.COMPATIBILITY_CHECK, { setBack: true });
  };

  const isDisabled =
    (tab === 'make-model' && !(makeModel && country && modelYear)) ||
    (tab === 'vin' && !vinNumber);

  return (
    <Screen
      actions={
        <ActionBar>
          <Button fullWidth onClick={handleSubmit} disabled={isDisabled}>
            {t('add.check')}
          </Button>
        </ActionBar>
      }
    >
      <ScreenHeader
        title={t('add.title')}
        // App-supplied text, shown as sent.
        subtitle={newVehicleSectionDescription || undefined}
        host={getRedirectHost(redirectUri)}
      />
      <SegmentedControl<Tab>
        label={t('add.tabs_label')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'make-model', label: t('add.tab.make_model') },
          { value: 'vin', label: t('add.tab.vin') },
        ]}
      />
      {tab === 'make-model' ? (
        <MakeModelYearTab
          makeModel={makeModel}
          setMakeModel={setMakeModel}
          modelYear={modelYear}
          setModelYear={setModelYear}
          country={country}
          setCountry={setCountry}
          supportedMakeModels={supportedMakeModels}
          countryOptions={countryOptions}
        />
      ) : (
        <VinNumberTab
          vinNumber={vinNumber}
          setVinNumber={setVinNumber}
          country={country}
          setCountry={setCountry}
          countryOptions={countryOptions}
        />
      )}
    </Screen>
  );
};
