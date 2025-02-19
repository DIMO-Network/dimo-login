import React, { ReactNode } from 'react';

interface SecondaryButtonProps {
  onClick: () => void;
  children: ReactNode;
  width?: string; // Optional width prop
  disabled?: boolean;
}

const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  onClick,
  children,
  width,
  disabled,
}) => (
  <button
    onClick={onClick}
    disabled={disabled ? disabled : false}
    className={`font-medium text-black ${width} disabled:bg-gray-400`}
  >
    {children}
  </button>
);

export default SecondaryButton;
