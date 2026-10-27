// components/Shared/PrimaryButton.tsx
import React, { ReactNode } from 'react';

import { Button } from '../ui';

interface PrimaryButtonProps {
  onClick: () => void;
  children: ReactNode;
  width?: string; // Optional width prop
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * The popup's main CTA: the OEM brand color when one is configured (the
 * `--popup-brand-*` variables AppShell sets), otherwise ink.
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  onClick,
  children,
  width,
  disabled,
  loading,
  className,
}) => (
  <Button
    variant="primary"
    onClick={onClick}
    disabled={disabled}
    loading={loading}
    className={[width, className].filter(Boolean).join(' ')}
  >
    {children}
  </Button>
);

export default PrimaryButton;
