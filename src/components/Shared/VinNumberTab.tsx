import { FC } from 'react';
import { Input } from './Input';
import { Select } from './Select';

interface VinNumberTabProps {
  vinNumber: string;
  setVinNumber: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  countryList: string[];
}

export const VinNumberTab: FC<VinNumberTabProps> = ({
  vinNumber,
  setVinNumber,
  country,
  setCountry,
  countryList,
}) => {
  return (
    <div className="mt-4">
      <label className="block text-sm text-[#000000]">VIN Number</label>
      <Input
        type="text"
        placeholder="1N6AD0EVXCC459517"
        onChange={(value) => setVinNumber(value)}
        value={vinNumber}
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

export default VinNumberTab;
