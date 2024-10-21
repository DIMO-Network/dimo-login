// src/components/Loader.tsx
import React from "react";

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-lg mb-4">Authenticating user...</div>
      <div className="loader border-t-4 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
    </div>
  );
};

export default Loader;
