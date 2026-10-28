import React from 'react';

import { useT } from '../../i18n';
import { TextField } from '../ui';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  id?: string;
  label?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  ...rest
}) => {
  const t = useT();
  return (
    <TextField
      type={type}
      value={value}
      placeholder={placeholder}
      onValueChange={onChange}
      clearLabel={t('common.clear')}
      className="w-full"
      {...rest}
    />
  );
};

export default Input;
