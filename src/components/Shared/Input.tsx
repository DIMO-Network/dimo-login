import React from 'react';
import { XCircleIcon } from '@heroicons/react/16/solid';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder = '',
  type = 'text',
}) => {
  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          type={type}
          className="w-full mt-1 p-2 border rounded-md text-sm text-[#080808] border-gray-300 
                  focus:border-[#080808] focus:ring-[#080808] focus:outline-none pr-10"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-2 mt-1"
            onClick={() => onChange('')}
          >
            <XCircleIcon className="size-4 text-[#080808]" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Input;
