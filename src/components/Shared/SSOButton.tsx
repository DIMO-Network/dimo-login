import React from 'react';

type SSOButtonProps = {
  onClick: () => void;
  icon: React.ReactNode;
  text: string;
};

export const SSOButton: React.FC<SSOButtonProps> = ({ onClick, icon, text }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center gap-2 w-full sm:max-w-[210px] h-[40px] rounded-full border border-gray-300 bg-white text-black text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
  >
    {icon}
    {text}
  </button>
);

export default SSOButton;
