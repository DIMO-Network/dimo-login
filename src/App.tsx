import React, { useState } from "react";
import EmailInput from "./components/Auth/EmailInput";
import Loader from "./components/Shared/Loader";
import SuccessPage from "./components/Auth/SuccessPage";
import { authenticateUser } from "./utils/authUtils";
import logo from './assets/images/dimo-logo.png';
import "./App.css";

function App() {
  const [authStep, setAuthStep] = useState(0);  // 0 = Email Input, 1 = Loading, 2 = Success
  const [email, setEmail] = useState("");

  const handleEmailSubmit = (email: string) => {
    setEmail(email);
    setAuthStep(1);  // Move to the "Authenticating..." step

    // Simulate authentication
    authenticateUser(email, () => {
      setAuthStep(2);  // Move to success page after authentication
    });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <img src={logo} alt="Dimo Logo" className="mx-auto mb-6 w-32 h-auto" />
        {authStep === 0 && <EmailInput onSubmit={handleEmailSubmit} />}
        {authStep === 1 && <Loader />}
        {authStep === 2 && <SuccessPage />}
      </div>
    </div>
  );
}

export default App;
