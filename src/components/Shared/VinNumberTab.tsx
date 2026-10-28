import { FC } from 'react';

import { useT } from '../../i18n';
import { type SelectOption } from '../ui';
import { Input } from './Input';
import { Select } from './Select';

interface VinNumberTabProps {
  vinNumber: string;
  setVinNumber: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  countryOptions: SelectOption[];
}

export const VinNumberTab: FC<VinNumberTabProps> = ({
  vinNumber,
  setVinNumber,
  country,
  setCountry,
  countryOptions,
}) => {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <Input
        id="vin"
        type="text"
        label={t('add.vin')}
        placeholder={t('add.vin_placeholder')}
        autoComplete="off"
        // VINs are ASCII; full-width input from a Japanese keyboard is folded.
        onChange={(value) => setVinNumber(value.normalize('NFKC').toUpperCase().trim())}
        value={vinNumber}
      />
      <Select
        id="vin-country"
        name="vin-country"
        label={t('add.country')}
        options={countryOptions}
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />
    </div>
  );
};

export default VinNumberTab;
