// src/components/Loader.tsx
import React from "react";
import { useUIManager } from "../../context/UIManagerContext";

const Loader: React.FC = () => {
  const { loadingMessage } = useUIManager();

  return (
    <div className="flex flex-col items-center gap-10">
      {loadingMessage && <div className="text-lg">{loadingMessage}</div>}
      <div className="flex space-x-2">
        <div className="dot w-3 h-3 rounded-full animate-wave delay-100"></div>
        <div className="dot w-3 h-3 rounded-full animate-wave delay-200"></div>
        <div className="dot w-3 h-3 rounded-full animate-wave delay-300"></div>
      </div>
    </div>
  );
};

export default Loader;
