import React, { useId } from 'react';
import { CheckIcon, ChevronDownIcon, XCircleIcon } from '@heroicons/react/16/solid';

import { cn } from './cn';

// Recipes from the console's ui/checkbox.tsx, ui/switch.tsx, TextField.css and
// NativeSelect.tsx, on native elements instead of Radix.

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...props }, ref) => (
  <span
    className={cn(
      'relative inline-grid size-[18px] shrink-0 place-items-center',
      className,
    )}
  >
    <input
      ref={ref}
      type="checkbox"
      className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[4px] border border-control-border bg-sheet transition-colors checked:border-accent checked:bg-accent focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
    <CheckIcon
      aria-hidden="true"
      className="pointer-events-none relative size-3.5 text-on-accent opacity-0 peer-checked:opacity-100"
    />
  </span>
));
Checkbox.displayName = 'Checkbox';

export const Switch = ({
  checked,
  onChange,
  disabled,
  labelledBy,
  describedBy,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  labelledBy?: string;
  describedBy?: string;
  /** Used when there is no visible label to point at. */
  label?: string;
  id?: string;
}) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-labelledby={labelledBy}
    aria-describedby={describedBy}
    aria-label={labelledBy ? undefined : label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="group inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-control-border transition-colors focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50 aria-checked:bg-accent"
  >
    <span className="pointer-events-none block size-5 translate-x-0 rounded-full bg-ink shadow-sm transition-transform group-aria-checked:translate-x-5 group-aria-checked:bg-on-accent" />
  </button>
);

const fieldShell =
  'flex min-h-10 flex-row items-center rounded-control border border-control-border bg-control px-3 text-fg transition-[border-color,box-shadow] focus-within:border-focus-ring focus-within:ring-[3px] focus-within:ring-accent-soft not-focus-within:hover:border-control-border-hover';

export const FieldLabel = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <label htmlFor={htmlFor} className="text-label text-muted">
    {children}
  </label>
);

export const TextField = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    label?: React.ReactNode;
    hint?: React.ReactNode;
    error?: React.ReactNode;
    onValueChange?: (value: string) => void;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    /** Accessible name of the clear button; the button shows only with a value. */
    clearLabel?: string;
  }
>(
  (
    { label, hint, error, onValueChange, onChange, clearLabel, className, id, ...input },
    ref,
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <div className={fieldShell}>
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            className="w-full bg-transparent text-[14px] leading-5 text-fg outline-hidden placeholder:text-muted"
            onChange={(event) => {
              onChange?.(event);
              onValueChange?.(event.target.value);
            }}
            {...input}
          />
          {clearLabel && input.value ? (
            <button
              type="button"
              aria-label={clearLabel}
              className="-mr-1 ml-1 rounded-full p-1 text-muted hover:text-ink"
              onClick={() => onValueChange?.('')}
            >
              <XCircleIcon className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {hint && (
          <p id={hintId} className="text-label font-normal text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-label text-negative">
            {error}
          </p>
        )}
      </div>
    );
  },
);
TextField.displayName = 'TextField';

export interface SelectOption {
  value: string;
  label: string;
}

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: React.ReactNode;
    options: SelectOption[];
    placeholder?: string;
  }
>(({ label, options, placeholder, className, id, ...select }, ref) => {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <FieldLabel htmlFor={selectId}>{label}</FieldLabel>}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className="h-10 w-full cursor-pointer appearance-none rounded-control border border-control-border bg-control pl-3 pr-9 text-[14px] leading-5 text-fg outline-hidden transition-[border-color,box-shadow] hover:border-control-border-hover focus:border-focus-ring focus:ring-[3px] focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
          {...select}
        >
          {placeholder !== undefined && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        />
      </div>
    </div>
  );
});
NativeSelect.displayName = 'NativeSelect';

/** Two or three mutually exclusive views (console SegmentedControl). */
export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) => (
  <div
    role="tablist"
    aria-label={label}
    className="flex w-fit max-w-full flex-row gap-0.5 overflow-x-auto rounded-full bg-control p-[3px]"
  >
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onChange(option.value)}
          className={cn(
            'shrink-0 cursor-pointer select-none whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-[18px] text-muted transition-colors hover:text-fg',
            selected && 'bg-bright text-ink shadow-sm hover:text-ink',
          )}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
