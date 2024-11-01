// components/Auth/EmailInput.tsx
import React, { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../../context/AuthContext"; // Use the auth context
import { fetchUserDetails } from "../../services/accountsService";

interface EmailInputProps {
  onSubmit: (email: string) => void;
  setOtpId: (otpId: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ onSubmit, setOtpId }) => {
  const {
    sendOtp,
    setAuthStep,
    authenticateUser,
    setJwt,
    setUser,
    createAccountWithPasskey,
  } = useAuthContext(); // Get sendOtp from the context
  const [email, setEmail] = useState("");
  const [triggerAuth, setTriggerAuth] = useState(false);

  const handleSubmit = async () => {
    if (!email) return;

    onSubmit(email); // Trigger any on-submit actions

    // Check if the user exists and authenticate if they do
    const userExistsResult = await fetchUserDetails(email);
    if (userExistsResult.success && userExistsResult.user) {
      setUser(userExistsResult.user);
      setTriggerAuth(true); // Trigger authentication for existing users
      return; // Early return to prevent additional logic from running
    }

    // If user doesn't exist, create an account and send OTP
    const account = await createAccountWithPasskey(email);
    if (account.success && account.user) {
      const otpResult = await sendOtp(email); // Send OTP for new account

      if (otpResult.success && otpResult.otpId) {
        setOtpId(otpResult.otpId); // Store the OTP ID
        setAuthStep(1); // Move to OTP input step
      } else {
        console.error(otpResult.error); // Handle OTP sending failure
      }
    } else {
      console.error("Account creation failed"); // Handle account creation failure
    }
  };

  useEffect(() => {
    // Only authenticate if `user` is set and authentication hasn't been triggered
    if (triggerAuth) {
      authenticateUser(email, "credentialBundle", setJwt, setAuthStep);
    }
  }, [triggerAuth]);

  return (
    <div className="flex flex-col space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="p-2 border border-gray-300 rounded-md"
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Authenticate
      </button>
    </div>
  );
};

export default EmailInput;
