import React, { forwardRef, type FC } from 'react';

interface CheckboxProps {
  className?: string;
  defaultChecked?: boolean;
  id?: string;
  name: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  height?: string;
  width?: string;
  checked?: boolean;
  disabled?: boolean;
}

export const Checkbox: FC<CheckboxProps> = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      onChange,
      name,
      id,
      defaultChecked = false,
      className = '',
      height = 'h-5',
      width = 'w-5',
      checked,
    },
    ref,
  ) => {
    return (
      <div
        className={`${className} ${height} ${width} group grid size-4 grid-cols-1 items-center`}
      >
        <input
          {...(checked !== undefined ? { checked } : { defaultChecked })}
          id={id}
          name={name}
          onChange={onChange}
          type="checkbox"
          className={`${height} ${width} col-start-1 row-start-1 appearance-none rounded-md border border-gray-300 bg-white checked:border-black checked:bg-black indeterminate:border-black indeterminate:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto`}
          ref={ref}
        />
        <svg
          fill="none"
          viewBox="0 0 14 14"
          className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-gray-950/25"
        >
          <path
            d="M3 8L6 11L11 3.5"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-0 group-has-[:checked]:opacity-100"
          />
          <path
            d="M3 7H11"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-0 group-has-[:indeterminate]:opacity-100"
          />
        </svg>
      </div>
    );
  },
);

export default Checkbox;
