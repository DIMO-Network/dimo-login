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
    className={`bg-black font-medium text-zinc-100 px-4 py-2 rounded-3xl hover:bg-gray-900 ${width} disabled:bg-gray-400 ${className ?? ''}`}
  >
    {children}
  </button>
);

export default PrimaryButton;
