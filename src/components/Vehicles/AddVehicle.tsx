import { useState, type FC } from "react";

import Card from "../Shared/Card";
import Header from "../Shared/Header";
import { getAppUrl } from "../../utils/urlHelpers";

import countries from "i18n-iso-countries"; // Install using npm install i18n-iso-countries
import enLocale from "i18n-iso-countries/langs/en.json";
import { UiStates, useUIManager } from "../../context/UIManagerContext";
import { supportedMakeModels } from "../../utils/tablelandUtils";
import { AutoCompleteInput } from "../Shared/AutoCompleteInput";
import { Select } from "../Shared/Select";
import { Input } from "../Shared/Input";

// Register English country names
countries.registerLocale(enLocale);
const countryList = Object.values(countries.getNames("en"));
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
  const [makeModel, setMakeModel] = useState("");
  const [modelYear, setModelYear] = useState("");
  const [vinNumber, setVinNumber] = useState("");
  const [country, setCountry] = useState("United States of America");

  const handleSubmit = () => {
    setComponentData({
      makeModel,
      modelYear,
      vinNumber,
      country: countryMapping[country],
    });

    setUiState(UiStates.COMPATIBILITY_CHECK, { setBack: true });
  };

  const getTabColor = (isActive: boolean) =>
    isActive ? "bg-white text-black" : "bg-black text-white";

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
        />

        <div className="w-full max-w-md mx-auto bg-white rounded-full">
          {/* Toggle Buttons */}
          <div className="flex w-full border border-[#D4D4D8] rounded-full bg-black">
            <button
              className={`flex-1 py-2 rounded-full ${getTabColor(tab === 0)}`}
              onClick={() => setTab(0)}
            >
              Make, Model, Year
            </button>
            <button
              className={`flex-1 py-2 rounded-full ${getTabColor(tab === 1)}`}
              onClick={() => setTab(1)}
            >
              VIN Number
            </button>
          </div>

          {tab === 0 && (
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
              <Select
                options={Array.from({ length: 2026 - 1900 + 1 }, (_, i) =>
                  (2026 - i).toString()
                )}
                value={modelYear}
                onChange={(e) => setModelYear(e.target.value)}
                className="w-full mt-1"
                includeEmptyOption
              />

              {/* Country of Location */}
              <label className="block mt-4 text-sm">Country of location</label>
              <Select
                options={countryList}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full mt-1"
              />
            </div>
          )}

          {tab == 1 && (
            <div className="mt-4">
              <label className="block text-sm text-[#000000]">VIN Number</label>
              <Input
                type="text"
                placeholder="1N6AD0EVXCC459517"
                onChange={(vinNumber) => setVinNumber(vinNumber)}
                value={vinNumber}
              />

              {/* Country of Location */}
              <label className="block mt-4 text-sm">Country of location</label>
              <Select
                options={countryList}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full mt-1"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            disabled={
              (tab === 0 && !(makeModel && country && modelYear)) ||
              (tab === 1 && !vinNumber)
            }
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
