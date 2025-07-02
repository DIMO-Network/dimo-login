import React from 'react';
import { useUIManager } from '../../context/UIManagerContext';

export const UIManagerLoader: React.FC = () => {
  const { loadingMessage } = useUIManager();

  return <Loader message={loadingMessage} />;
};

export type LoaderProps = {
  message?: string;
};

export const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center gap-10">
      {!!message && <div className="text-lg">{message}</div>}
      <div className="flex space-x-2">
        <div className="dot w-3 h-3 rounded-full animate-wave delay-100"></div>
        <div className="dot w-3 h-3 rounded-full animate-wave delay-200"></div>
        <div className="dot w-3 h-3 rounded-full animate-wave delay-300"></div>
      </div>
    </div>
  );
};

export default UIManagerLoader;
