// components/Shared/SecondaryButton.tsx
import React, { ReactNode } from 'react';

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
  <button
    onClick={onClick}
    disabled={disabled ? disabled : false}
    className={`font-medium text-black ${width ?? ''} disabled:bg-gray-400 ${className ?? ''}`}
  >
    {children}
  </button>
);

export default SecondaryButton;
