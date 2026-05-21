// components/Shared/PrimaryButton.tsx
import React, { ReactNode } from 'react';

interface PrimaryButtonProps {
  onClick: () => void;
  children: ReactNode;
  width?: string; // Optional width prop
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * The popup's main CTA. Picks up the OEM brand color from a `--popup-brand-*`
 * CSS variable set at the App root. When no brand is configured, both vars
 * are absent and Tailwind falls back to the defaults (#000 / #fff).
 *
 * Hover state derives a slight luma shift from the bg + text vars via
 * color-mix so OEMs don't have to spec separate hover shades.
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  onClick,
  children,
  width,
  disabled,
  loading,
  className,
}) => (
  <button
    onClick={onClick}
    disabled={disabled ? disabled : false}
    className={
      'font-medium px-4 py-2 rounded-3xl ' +
      'bg-[var(--popup-brand-color,#000)] text-[var(--popup-brand-text,#f4f4f5)] ' +
      'hover:bg-[color-mix(in_srgb,var(--popup-brand-color,#000)_92%,var(--popup-brand-text,#f4f4f5))] ' +
      'disabled:bg-gray-400 disabled:text-white ' +
      `${width ?? ''} ${className ?? ''}`
    }
  >
    {children}
  </button>
);

export default PrimaryButton;
