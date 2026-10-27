import { FC, useId } from 'react';

import { useT } from '../../i18n';
import { FieldLabel, type SelectOption } from '../ui';
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
  countryOptions: SelectOption[];
}

const thisYear = new Date().getFullYear() + 1;
const YEARS = Array.from({ length: thisYear - 1900 + 1 }, (_, i) => String(thisYear - i));

export const MakeModelYearTab: FC<MakeModelYearTabProps> = ({
  makeModel,
  setMakeModel,
  modelYear,
  setModelYear,
  country,
  setCountry,
  supportedMakeModels,
  countryOptions,
}) => {
  const t = useT();
  const makeModelId = useId();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor={makeModelId}>{t('add.make_model')}</FieldLabel>
        <AutoCompleteInput
          id={makeModelId}
          options={supportedMakeModels}
          value={makeModel}
          onChange={setMakeModel}
          placeholder={t('add.make_model_placeholder')}
        />
      </div>
      <Select
        id="model-year"
        name="model-year"
        label={t('add.year')}
        options={YEARS}
        value={modelYear}
        onChange={(e) => setModelYear(e.target.value)}
        includeEmptyOption
      />
      <Select
        id="country"
        name="country"
        label={t('add.country')}
        options={countryOptions}
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />
    </div>
  );
};

export default MakeModelYearTab;
