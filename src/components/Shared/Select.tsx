import React, { forwardRef } from 'react';

import { useT } from '../../i18n';
import { NativeSelect, type SelectOption } from '../ui';

interface SelectProps {
  /** Plain strings (value and label alike) or value/label pairs. */
  options: (string | SelectOption)[];
  value?: string;
  defaultValue?: string;
  id?: string;
  name?: string;
  className?: string;
  label?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  includeEmptyOption?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      value,
      defaultValue,
      id = 'select',
      name = 'select',
      className = '',
      label,
      onChange,
      includeEmptyOption = false,
    },
    ref,
  ) => {
    const t = useT();
    return (
      <NativeSelect
        ref={ref}
        id={id}
        name={name}
        label={label}
        className={className}
        {...(value !== undefined ? { value } : { defaultValue: defaultValue ?? '' })}
        onChange={onChange}
        placeholder={includeEmptyOption ? t('common.select_placeholder') : undefined}
        options={options.map((option) =>
          typeof option === 'string' ? { value: option, label: option } : option,
        )}
      />
    );
  },
);

export default Select;
