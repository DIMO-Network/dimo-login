import React, { useState, useEffect, useId, useRef } from 'react';
import { XCircleIcon } from '@heroicons/react/16/solid';

import { useT } from '../../i18n';

interface AutoCompleteInputProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxSuggestions?: number;
  /** For a FieldLabel's htmlFor. */
  id?: string;
}

export const AutoCompleteInput: React.FC<AutoCompleteInputProps> = ({
  options,
  value,
  onChange,
  placeholder,
  maxSuggestions = 5,
  id,
}) => {
  const t = useT();
  const listboxId = useId();
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim() === '') {
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
    // Keys pressed while composing Japanese text belong to the IME.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        onChange(filteredOptions[highlightedIndex]);
      } else {
        onChange(value); // allow custom value if desired
      }
      setFilteredOptions([]);
      setIsFocused(false); // hides dropdown
    } else if (e.key === 'Escape') {
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
          id={id}
          type="text"
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={isFocused && filteredOptions.length > 0}
          aria-autocomplete="list"
          className="h-10 w-full rounded-control border border-control-border bg-control pl-3 pr-9 text-[14px] leading-5 text-fg outline-hidden transition-[border-color,box-shadow] placeholder:text-muted hover:border-control-border-hover focus:border-focus-ring focus:ring-[3px] focus:ring-accent-soft"
          placeholder={placeholder ?? t('common.search_placeholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
        />
        {value && (
          <button
            type="button"
            aria-label={t('common.clear')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink"
            onClick={() => onChange('')}
          >
            <XCircleIcon className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {isFocused && filteredOptions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-control border border-outline bg-overlay p-1 text-fg shadow-float"
        >
          {filteredOptions.map((option, idx) => (
            <li
              key={option}
              role="option"
              aria-selected={idx === highlightedIndex}
              className={`cursor-pointer rounded-chip px-2.5 py-2 text-body-sm ${
                idx === highlightedIndex ? 'bg-control' : ''
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

export default AutoCompleteInput;
