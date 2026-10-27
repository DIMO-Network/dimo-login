import React from 'react';

import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'destructive-ghost';
type Size = 'md' | 'sm' | 'icon';

// Recipes from the console's Button.css. Primary is the OEM's color when the
// brand record has one, otherwise ink (DESIGN.md: "ink acts, teal means live").
const VARIANTS: Record<Variant, { base: string; hover: string }> = {
  'primary': {
    base: 'bg-brand text-brand-fg',
    hover:
      'hover:bg-[color-mix(in_srgb,var(--popup-brand-color,rgb(var(--btn-primary)))_88%,var(--popup-brand-text,rgb(var(--btn-primary-fg))))]',
  },
  'secondary': {
    base: 'border border-outline bg-control text-ink',
    hover: 'hover:bg-highest',
  },
  'ghost': {
    base: 'bg-transparent text-muted',
    hover: 'hover:bg-control hover:text-ink',
  },
  'destructive': { base: 'bg-negative-soft text-negative', hover: 'hover:brightness-95' },
  'destructive-ghost': {
    base: 'bg-transparent text-negative',
    hover: 'hover:bg-negative-soft',
  },
};

const SIZES: Record<Size, string> = {
  md: 'h-10 min-h-10 px-4 text-body-sm',
  sm: 'h-8 min-h-8 px-3 text-[13px] leading-[18px]',
  icon: 'size-8 min-h-0 shrink-0 px-0',
};

export const Dots = () => (
  <span className="inline-flex items-center gap-1" aria-hidden="true">
    {[0, 150, 300].map((delay) => (
      <span
        key={delay}
        className="size-1.5 animate-dot-wave rounded-full bg-current"
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </span>
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  /**
   * Inactive but still focusable (aria-disabled), so a screen reader can reach
   * it and hear why through `disabledReasonId`.
   */
  disabled?: boolean;
  /** id of the element that explains why the button is disabled. */
  disabledReasonId?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled = false,
      disabledReasonId,
      className,
      children,
      onClick,
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    const inactive = disabled || loading;
    const recipe = VARIANTS[variant];
    return (
      <button
        ref={ref}
        type={type}
        aria-disabled={inactive || undefined}
        aria-busy={loading || undefined}
        aria-describedby={disabled ? disabledReasonId : undefined}
        onClick={(event) => {
          if (inactive) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        className={cn(
          'inline-flex select-none items-center justify-center gap-2 rounded-full text-center font-semibold transition-[filter,background-color,color] duration-150',
          SIZES[size],
          recipe.base,
          inactive ? 'cursor-not-allowed opacity-40' : recipe.hover,
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {loading ? <Dots /> : children}
      </button>
    );
  },
);

Button.displayName = 'Button';
