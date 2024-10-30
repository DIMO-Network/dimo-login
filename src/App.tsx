import React, { useState, useEffect } from "react";
import EmailInput from "./components/Auth/EmailInput";
import Loader from "./components/Shared/Loader";
import SuccessPage from "./components/Auth/SuccessPage";
import logo from './assets/images/dimo-logo.png';
import "./App.css";
import { useAuthContext } from "./context/AuthContext";
import { useDevCredentials } from "./context/DevCredentialsContext"; // Import DevCredentialsContext
import OtpInput from "./components/Auth/OtpInput";
import VehicleManager from "./components/Vehicles/VehicleManager";

function App() {
  const { loading: authLoading, authStep } = useAuthContext();  // Get loading state from AuthContext
  const { credentialsLoading, clientId, apiKey, redirectUri } = useDevCredentials();  // Get loading state and credentials from DevCredentialsContext
  const [email, setEmail] = useState("");
  const [otpId, setOtpId] = useState("");  // New state for OTP ID

  // If either credentials or auth is loading, show the loader
  if (authLoading || credentialsLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <Loader />
      </div>
    );
  }

  // If credentials are missing after loading, show an error
  if (!clientId || !apiKey || !redirectUri) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-xl font-bold mb-4">Missing Credentials</h1>
          <p>Please check the configuration and reload the page.</p>
        </div>
      </div>
    );
  }

  // If not loading and credentials are available, render the app
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <img src={logo} alt="Dimo Logo" className="mx-auto mb-6 w-32 h-auto" />
        
        {/* Render components based on authStep */}
        {authStep === 0 && <EmailInput onSubmit={setEmail} setOtpId={setOtpId}/>}
        {authStep === 1 && <OtpInput email={email} otpId={otpId}/>}
        {authStep === 2 && <VehicleManager />}
        {authStep === 3 && <SuccessPage />}
      </div>
    </div>
  );
}

export default App;