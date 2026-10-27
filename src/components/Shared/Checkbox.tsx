import React, { forwardRef } from 'react';

import { Checkbox as UiCheckbox } from '../ui';

interface CheckboxProps {
  'className'?: string;
  'defaultChecked'?: boolean;
  'id'?: string;
  'name': string;
  'onChange': React.ChangeEventHandler<HTMLInputElement>;
  'checked'?: boolean;
  'disabled'?: boolean;
  'aria-label'?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ defaultChecked = false, checked, className, ...props }, ref) => (
    <UiCheckbox
      ref={ref}
      className={className}
      {...(checked !== undefined ? { checked } : { defaultChecked })}
      {...props}
    />
  ),
);
Checkbox.displayName = 'Checkbox';

export default Checkbox;
