import { useState, type FC } from 'react';

import Card from '../Shared/Card';
import Header from '../Shared/Header';
import { getAppUrl } from '../../utils/urlHelpers';

import countries from 'i18n-iso-countries'; // Install using npm install i18n-iso-countries
import enLocale from 'i18n-iso-countries/langs/en.json';
import { UiStates, useUIManager } from '../../context/UIManagerContext';
import { supportedMakeModels } from '../../utils/tablelandUtils';
import { AutoCompleteInput } from '../Shared/AutoCompleteInput';

// Register English country names
countries.registerLocale(enLocale);
const countryList = Object.values(countries.getNames('en'));
const countryCodes = countries.getAlpha3Codes(); // { United States: "US", Canada: "CA", ... }
let countryMapping: Record<string, string> = {}; // Define type properly

Object.entries(countryCodes).forEach(([code, _], index) => {
  const countryName = countryList[index]; // Get the corresponding country name

  if (countryName) {
    countryMapping[countryName] = code; // Map country name -> country code
  }
});

export const AddVehicle: FC = () => {
  const appUrl = getAppUrl();

  const { setComponentData, setUiState } = useUIManager(); // Access the manage function from the context

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

  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[500px]">
      <Header
        title={`Add a new car`}
        subtitle={appUrl.hostname}
        link={`${appUrl.protocol}//${appUrl.host}`}
      />

      <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg">
        {/* Toggle Buttons */}
        <div className="flex w-full border rounded-full bg-gray-200">
          <button
            className={`flex-1 py-2 rounded-full ${
              tab === 0 ? 'bg-white text-black' : 'bg-gray-200 text-gray-600'
            }`}
            onClick={() => setTab(0)}
          >
            Make, Model, Year
          </button>
          <button
            className={`flex-1 py-2 rounded-full ${
              tab === 1 ? 'bg-white text-black' : 'bg-gray-200 text-gray-600'
            }`}
            onClick={() => setTab(1)}
          >
            VIN Number
          </button>
        </div>

        {tab == 0 && (
          <div className="mt-4">
            {/* Make and Model */}
            <label className="block text-sm">Make and model</label>

            <AutoCompleteInput
              options={supportedMakeModels}
              value={makeModel}
              onChange={setMakeModel}
              placeholder="Ford Bronco"
            />

            {/* Model Year */}
            <label className="block mt-4 text-sm">Model year</label>
            <select
              className="w-full mt-1 p-2 border rounded-md bg-gray-100 text-gray-900"
              value={modelYear}
              onChange={(e: any) => setModelYear(e.target.value)}
            >
              <option value="" disabled hidden>
                Select
              </option>
              {Array.from({ length: 2026 - 1900 + 1 }, (_, i) => (
                <option key={2026 - i} value={2026 - i}>
                  {2026 - i}
                </option>
              ))}
            </select>

            {/* Country of Location */}
            <label className="block mt-4 text-sm">Country of location</label>
            <select
              className="w-full mt-1 p-2 border rounded-md bg-white text-gray-900"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {countryList.map((countryName, index) => (
                <option key={index} value={countryName}>
                  {countryName}
                </option>
              ))}
            </select>
          </div>
        )}

        {tab == 1 && (
          <div className="mt-4">
            <label className="block text-sm text-[#000000]">VIN Number</label>
            <input
              type="text"
              className="w-full mt-1 p-2 border rounded-md text-[#080808] focus:border-[#080808] focus:ring-[#080808] focus:outline-none"
              placeholder="1N6AD0EVXCC459517"
              onChange={(e) => setVinNumber(e.target.value)}
            />

            {/* Country of Location */}
            <label className="block mt-4 text-sm">Country of location</label>
            <select
              className="w-full mt-1 p-2 border rounded-md bg-white text-gray-900"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {countryList.map((countryName, index) => (
                <option key={index} value={countryName}>
                  {countryName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Submit Button */}
        <button
          disabled={
            (tab == 0 && !(makeModel && country && modelYear)) || (tab == 1 && !vinNumber)
          }
          className="w-full mt-6 p-3 rounded-full bg-black disabled:bg-[#A1A1AA] text-white"
          onClick={handleSubmit}
        >
          Check compatibility
        </button>
      </div>
    </Card>
  );
};
