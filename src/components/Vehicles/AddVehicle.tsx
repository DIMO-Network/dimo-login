import { useState, type FC } from 'react';
import countries from 'i18n-iso-countries'; // Install using npm install i18n-iso-countries
import enLocale from 'i18n-iso-countries/langs/en.json';
import { useDevCredentials } from '../../context/DevCredentialsContext';

import { Card, Header, MakeModelYearTab, VinNumberTab } from '../Shared';
import { getAppUrl } from '../../utils/urlHelpers';
import { UiStates, useUIManager } from '../../context/UIManagerContext';
import { supportedMakeModels } from '../../utils/tablelandUtils';

// Register English country names
countries.registerLocale(enLocale);
const countryList = Object.values(countries.getNames('en'));
const countryCodes = countries.getAlpha3Codes(); // { United States: "US", Canada: "CA", ... }
let countryMapping: Record<string, string> = {};

Object.entries(countryCodes).forEach(([code, _], index) => {
  const countryName = countryList[index];
  if (countryName) {
    countryMapping[countryName] = code;
  }
});

export const AddVehicle: FC = () => {
  const appUrl = getAppUrl();
  const { setComponentData, setUiState } = useUIManager();
  const { newVehicleSectionDescription } = useDevCredentials();

  const [tab, setTab] = useState(0);
  const [makeModel, setMakeModel] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [vinNumber, setVinNumber] = useState('');
  const [country, setCountry] = useState('United States of America');

  const handleSubmit = () => {
    setComponentData({
      makeModel,
      modelYear,
      vinNumber,
      country: countryMapping[country],
    });
    setUiState(UiStates.COMPATIBILITY_CHECK, { setBack: true });
  };

  const tabs = ['Make, Model, Year', 'VIN Number'];

  const renderTabs = () => {
    const tabColors = {
      active: 'bg-white text-black',
      inactive: 'bg-black text-white',
    };

    return (
      <div className="flex w-full border border-[#D4D4D8] rounded-full bg-black">
        {tabs.map((label, index) => (
          <button
            key={index}
            className={`flex-1 py-2 rounded-full ${
              tab === index ? tabColors.active : tabColors.inactive
            }`}
            onClick={() => setTab(index)}
          >
            {label}
          </button>
        ))}
      </div>
    );
  };

  const tabContent = [
    <MakeModelYearTab
      makeModel={makeModel}
      setMakeModel={setMakeModel}
      modelYear={modelYear}
      setModelYear={setModelYear}
      country={country}
      setCountry={setCountry}
      supportedMakeModels={supportedMakeModels}
      countryList={countryList}
    />,
    <VinNumberTab
      vinNumber={vinNumber}
      setVinNumber={setVinNumber}
      country={country}
      setCountry={setCountry}
      countryList={countryList}
    />,
  ];

  const isDisabled =
    (tab === 0 && !(makeModel && country && modelYear)) || (tab === 1 && !vinNumber);

  return (
    <Card
      width="w-full max-w-[600px]"
      height="h-fit"
      className="flex flex-col items-center"
    >
      <div className="flex flex-col gap-6 w-[440px]">
        <Header
          title={`Add a new car`}
          subtitle={appUrl.hostname}
          link={`${appUrl.protocol}//${appUrl.host}`}
          description={newVehicleSectionDescription}
        />

        <div className="w-full max-w-md mx-auto bg-white rounded-full">
          {renderTabs()}
          {tabContent[tab]}

          <button
            disabled={isDisabled}
            className="w-full mt-6 p-3 rounded-full bg-black disabled:bg-[#A1A1AA] text-white"
            onClick={handleSubmit}
          >
            Check compatibility
          </button>
        </div>
      </div>
    </Card>
  );
};
