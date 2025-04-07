import React, { forwardRef } from "react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

interface SelectProps {
  options: string[];
  value?: string;
  defaultValue?: string;
  id?: string;
  name?: string;
  className?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  includeEmptyOption?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      value,
      defaultValue = "",
      id = "select",
      name = "select",
      className = "",
      onChange,
      includeEmptyOption = false,
    },
    ref
  ) => {
    return (
      <div className={`mt-2 grid grid-cols-1 ${className}`}>
        <select
          id={id}
          name={name}
          value={value}
          defaultValue={defaultValue}
          ref={ref}
          onChange={onChange}
          className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline sm:text-sm/6"
        >
          {includeEmptyOption && (
            <option value="" disabled hidden>
              Select
            </option>
          )}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
        />
      </div>
    );
  }
);

export default Select;
