import { FC } from 'react';
import { AutoCompleteInput } from './AutoCompleteInput';
import { Select } from './Select';

interface MakeModelYearTabProps {
  makeModel: string;
  setMakeModel: (value: string) => void;
  modelYear: string;
  setModelYear: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  supportedMakeModels: string[];
  countryList: string[];
}

export const MakeModelYearTab: FC<MakeModelYearTabProps> = ({
  makeModel,
  setMakeModel,
  modelYear,
  setModelYear,
  country,
  setCountry,
  supportedMakeModels,
  countryList,
}) => {
  return (
    <div className="mt-4">
      <label className="block text-sm">Make and model</label>
      <AutoCompleteInput
        options={supportedMakeModels}
        value={makeModel}
        onChange={setMakeModel}
        placeholder="Ford Bronco"
      />

      <label className="block mt-4 text-sm">Model year</label>
      <Select
        options={Array.from({ length: 2026 - 1900 + 1 }, (_, i) => (2026 - i).toString())}
        value={modelYear}
        onChange={(e) => setModelYear(e.target.value)}
        className="w-full mt-1"
        includeEmptyOption
      />

      <label className="block mt-4 text-sm">Country of location</label>
      <Select
        options={countryList}
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="w-full mt-1"
      />
    </div>
  );
};

export default MakeModelYearTab;
