import React, { useRef } from 'react';

import { useT } from '../../i18n';
import { cn } from '../ui/cn';

export const CODE_LENGTH = 6;

// Digits only, whatever the keyboard sent: NFKC turns full-width ３ (Japanese
// IMEs) into 3, and anything else is dropped.
export const toDigits = (value: string) => value.normalize('NFKC').replace(/\D/g, '');

/** A digit was typed or pasted, not only deleted: the last error no longer applies. */
export const hasNewDigit = (prev: string[], next: string[]): boolean =>
  next.some((d, i) => d !== '' && d !== prev[i]);

interface CodeBoxesProps {
  digits: string[];
  onDigitsChange: (next: string[]) => void;
  /** The code was rejected: the boxes show as invalid. */
  invalid: boolean;
  /** Enter pressed in a box. */
  onSubmit: () => void;
}

/** Six boxes for an emailed code. The parent owns the digits. */
export const CodeBoxes: React.FC<CodeBoxesProps> = ({
  digits,
  onDigitsChange,
  invalid,
  onSubmit,
}) => {
  const t = useT();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (index: number) =>
    inputs.current[Math.min(index, CODE_LENGTH - 1)]?.focus();

  // Typing fills one box and moves on; pasting or autofill fills from here.
  const fillFrom = (index: number, value: string) => {
    const typed = toDigits(value);
    if (!typed) {
      onDigitsChange(digits.map((d, i) => (i === index ? '' : d)));
      return;
    }
    const next = [...digits];
    typed
      .slice(0, CODE_LENGTH - index)
      .split('')
      .forEach((d, i) => {
        next[index + i] = d;
      });
    onDigitsChange(next);
    focus(index + typed.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const native = e.nativeEvent as unknown as {
      isComposing?: boolean;
      keyCode?: number;
    };
    if (native.isComposing || native.keyCode === 229) return;
    if (e.key === 'Enter') {
      onSubmit();
    } else if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      onDigitsChange(digits.map((d, i) => (i === index - 1 ? '' : d)));
      focus(index - 1);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focus(index - 1);
    } else if (e.key === 'ArrowRight') {
      focus(index + 1);
    }
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label text-muted">{t('otp.label')}</legend>
      <div className="flex justify-between gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            // Lets the browser or keyboard offer the emailed code.
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={t('otp.digit_label', { index: index + 1 })}
            aria-invalid={invalid ? true : undefined}
            value={digit}
            onChange={(e) => fillFrom(index, e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              fillFrom(index, e.clipboardData.getData('text'));
            }}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'h-12 w-full min-w-0 max-w-12 rounded-control border bg-control text-center text-title text-ink outline-hidden transition-[border-color,box-shadow] focus:border-focus-ring focus:ring-[3px] focus:ring-accent-soft',
              invalid ? 'border-negative' : 'border-control-border',
            )}
          />
        ))}
      </div>
    </fieldset>
  );
};
