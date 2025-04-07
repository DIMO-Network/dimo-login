import React, { useState, useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/16/solid";

interface AutoCompleteInputProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxSuggestions?: number;
}

export const AutoCompleteInput: React.FC<AutoCompleteInputProps> = ({
  options,
  value,
  onChange,
  placeholder = "Type to search...",
  maxSuggestions = 5,
}) => {
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim() === "") {
      setFilteredOptions([]);
      return;
    }

    const filtered = options
      .filter((opt) => opt.toLowerCase().includes(value.trim().toLowerCase()))
      .slice(0, maxSuggestions);

    setFilteredOptions(filtered);
    setHighlightedIndex(-1);
  }, [value, options, maxSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredOptions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        onChange(filteredOptions[highlightedIndex]);
      } else {
        onChange(value); // allow custom value if desired
      }
      setFilteredOptions([]);
      setIsFocused(false); // hides dropdown
    } else if (e.key === "Escape") {
      setFilteredOptions([]);
    } else if (!isFocused) {
      setIsFocused(true);
    }
  };

  const handleBlur = () => {
    // Give time for click events to register before hiding
    setTimeout(() => setIsFocused(false), 100);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          className="w-full mt-1 p-2 border rounded-md text-[#080808] border-gray-300 
                  focus:border-[#080808] focus:ring-[#080808] focus:outline-none pr-10"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
        />
        {value && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-2 mt-1"
            onClick={() => onChange("")}
          >
            <XMarkIcon className="size-4 text-gray-500" />
          </button>
        )}
      </div>
      {isFocused && filteredOptions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-md">
          {filteredOptions.map((option, idx) => (
            <li
              key={option}
              className={`p-2 cursor-pointer ${
                idx === highlightedIndex ? "bg-gray-100" : ""
              }`}
              onMouseDown={() => onChange(option)}
              onMouseEnter={() => setHighlightedIndex(idx)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
