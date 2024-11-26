import React, { useState, useEffect } from "react";
import EmailInput from "./components/Auth/EmailInput";
import SuccessPage from "./components/Auth/SuccessPage";
import "./App.css";
import { useAuthContext } from "./context/AuthContext";
import { useDevCredentials } from "./context/DevCredentialsContext"; // Import DevCredentialsContext
import OtpInput from "./components/Auth/OtpInput";
import VehicleManager from "./components/Vehicles/VehicleManager";
import LoadingScreen from "./components/Shared/LoadingScreen";
import ErrorScreen from "./components/Shared/ErrorScreen";
import { initializeSession } from "./services/sessionService";
import AdvancedTransaction from "./components/AdvancedTransaction/AdvancedTransaction";

function App() {
  const { loading: authLoading, setJwt, setUser } = useAuthContext(); // Get loading state from AuthContext
  const {
    credentialsLoading,
    clientId,
    apiKey,
    redirectUri,
    invalidCredentials,
    uiState,
    setUiState,
  } = useDevCredentials(); // Get loading state and credentials from DevCredentialsContext
  const [email, setEmail] = useState("");
  const [otpId, setOtpId] = useState(""); // New state for OTP ID

  useEffect(() => {
    if (clientId) {
      initializeSession({ clientId, setJwt, setUser, uiState, setUiState });
    }
  }, [clientId]);

  // If either credentials or auth is loading, show the loader
  // Loading state
  if (authLoading || credentialsLoading) {
    return <LoadingScreen />;
  }

  // Error screens
  if (invalidCredentials) {
    return (
      <ErrorScreen
        title="Invalid App Credentials"
        message="We're sorry, but it looks like there’s an issue with the app's credentials. This may be due to an invalid setup or unregistered access. Please reach out to the app's support team for assistance."
      />
    );
  }

  if (!clientId || !apiKey || !redirectUri) {
    return (
      <ErrorScreen
        title="Missing Credentials"
        message="Please check the configuration and reload the page."
      />
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-white lg:bg-[#F7F7F7]">
      {uiState === "EMAIL_INPUT" && (
        <EmailInput onSubmit={setEmail} setOtpId={setOtpId} />
      )}
      {uiState === "OTP_INPUT" && <OtpInput email={email} otpId={otpId} />}
      {uiState === "VEHICLE_MANAGER" && <VehicleManager />}
      {uiState === "ADVANCED_TRANSACTION" && <AdvancedTransaction />}
      {uiState === "SUCCESS" && <SuccessPage />}
    </div>
  );
}

export default App;
