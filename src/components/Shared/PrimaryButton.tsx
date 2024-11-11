// components/Shared/PrimaryButton.tsx
import React, { ReactNode } from "react";

interface PrimaryButtonProps {
  onClick: () => void;
  children: ReactNode;
  width?: string; // Optional width prop

}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({ onClick, children, width }) => (
  <button
    onClick={onClick}
    className={`bg-black text-zinc-100 px-4 py-2 rounded-3xl hover:bg-zinc-800 ${width}`}
  >
    {children}
  </button>
);

export default PrimaryButton;
