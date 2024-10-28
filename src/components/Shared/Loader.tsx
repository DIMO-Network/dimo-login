// src/components/Loader.tsx
import React from "react";
import { useDevCredentials } from "../../context/DevCredentialsContext";

const Loader: React.FC = () => {
  const { credentialsLoading } = useDevCredentials(); // Get loading state and credentials from DevCredentialsContext
  return (
    <div className="flex flex-col items-center">
      <div className="text-lg mb-4">
        {credentialsLoading ? "Waiting for credentials..." : "Authenticating user..."}
      </div>
      <div className="loader border-t-4 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
    </div>
  );
};

export default Loader;
