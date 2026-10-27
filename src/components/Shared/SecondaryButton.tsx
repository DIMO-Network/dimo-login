// components/Shared/SecondaryButton.tsx
import React, { ReactNode } from 'react';

import { Button } from '../ui';

interface SecondaryButtonProps {
  onClick: () => void;
  children: ReactNode;
  width?: string;
  disabled?: boolean;
  className?: string;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  onClick,
  children,
  width,
  disabled,
  className,
}) => (
  <Button
    variant="secondary"
    onClick={onClick}
    disabled={disabled}
    className={[width, className].filter(Boolean).join(' ')}
  >
    {children}
  </Button>
);

export default SecondaryButton;
