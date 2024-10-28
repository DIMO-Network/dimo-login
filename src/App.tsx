import React, { useState } from "react";
import EmailInput from "./components/Auth/EmailInput";
import Loader from "./components/Shared/Loader";
import SuccessPage from "./components/Auth/SuccessPage";
import logo from './assets/images/dimo-logo.png';
import "./App.css";
import { useAuthContext } from "./context/AuthContext";
import OtpInput from "./components/Auth/OtpInput";

function App() {
  const { loading } = useAuthContext();  // Get loading state from context
  const [authStep, setAuthStep] = useState(0);  // 0 = Email Input, 1 = Loading, 2 = Success
  const [email, setEmail] = useState("");
  const [otpId, setOtpId] = useState("");  // New state for OTP ID

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <Loader />
      </div>
    );
  }

  // If not loading, render the rest of the app
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <img src={logo} alt="Dimo Logo" className="mx-auto mb-6 w-32 h-auto" />
        
        {/* Render components based on authStep */}
        {authStep === 0 && <EmailInput onSubmit={setEmail} setAuthStep={setAuthStep} setOtpId={setOtpId}/>}
        {authStep === 1 && <OtpInput setAuthStep={setAuthStep} email={email} otpId={otpId}/>}
        {authStep === 2 && <SuccessPage />}
      </div>
    </div>
  );  
}

export default App;
