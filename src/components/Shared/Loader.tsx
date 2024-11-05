// src/components/Loader.tsx
import React from "react";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import { useAuthContext } from "../../context/AuthContext";

const Loader: React.FC = () => {
  const { credentialsLoading } = useDevCredentials(); // Get loading state and credentials from DevCredentialsContext
  const { loading } = useAuthContext();

  const loadingString = loading === true ? "Authenticating user..." : loading;

  return (
    <div className="flex flex-col items-center">
      <div className="text-lg mb-4">
        {credentialsLoading ? "Waiting for credentials..." : loadingString}
      </div>
      <div className="flex space-x-2">
        <div className="dot w-3 h-3 rounded-full animate-wave delay-100"></div>
        <div className="dot w-3 h-3 rounded-full animate-wave delay-200"></div>
        <div className="dot w-3 h-3 rounded-full animate-wave delay-300"></div>
      </div>
    </div>
  );
};

export default Loader;
