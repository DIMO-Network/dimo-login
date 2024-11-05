// components/Shared/PrimaryButton.tsx
import React, { ReactNode } from "react";

interface PrimaryButtonProps {
  onClick: () => void;
  children: ReactNode;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="bg-black text-zinc-100 px-4 py-2 rounded-3xl hover:bg-zinc-800"
  >
    {children}
  </button>
);

export default PrimaryButton;
