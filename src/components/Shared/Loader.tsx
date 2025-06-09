import React from 'react';
import { useUIManager } from '../../context/UIManagerContext';

export const Loader: React.FC<{ message?: string }> = ({ message }) => {
  const { loadingMessage } = useUIManager();
  const finalMessage = message || loadingMessage || 'Loading...';

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="text-lg">{finalMessage}</div>
      <div className="flex space-x-2">
        <div className="dot w-3 h-3 rounded-full animate-wave delay-100"></div>
        <div className="dot w-3 h-3 rounded-full animate-wave delay-200"></div>
        <div className="dot w-3 h-3 rounded-full animate-wave delay-300"></div>
      </div>
    </div>
  );
};

export default Loader;
