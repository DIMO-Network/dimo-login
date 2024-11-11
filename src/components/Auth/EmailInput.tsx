// components/Auth/EmailInput.tsx
import React, { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../../context/AuthContext"; // Use the auth context
import { fetchUserDetails } from "../../services/accountsService";
import ErrorMessage from "../Shared/ErrorMessage";
import PrimaryButton from "../Shared/PrimaryButton";
import Card from "../Shared/Card";
import Header from "../Shared/Header";

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
  const { error } = useAuthContext();
  const [triggerAuth, setTriggerAuth] = useState(false);

  const handleOtpSend = async (email: string) => {
    const otpResult = await sendOtp(email); // Send OTP for new account

    if (otpResult.success && otpResult.data.otpId) {
      setOtpId(otpResult.data.otpId); // Store the OTP ID
      setAuthStep(1); // Move to OTP input step
    } else if (!otpResult.success) {
      console.error(otpResult.error); // Handle OTP sending failure
    }
  };

  const handleSubmit = async () => {
    if (!email) return;

    onSubmit(email); // Trigger any on-submit actions

    // Check if the user exists and authenticate if they do
    const userExistsResult = await fetchUserDetails(email);
    if (userExistsResult.success && userExistsResult.data.user) {
      setUser(userExistsResult.data.user);
      setTriggerAuth(true); // Trigger authentication for existing users
      return; // Early return to prevent additional logic from running
    }

    // If user doesn't exist, create an account and send OTP
    const account = await createAccountWithPasskey(email);
    if (account.success && account.data.user) {
      await handleOtpSend(email);
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
    <Card width="w-[600px]" height="h-[308px]">
      <Header
        title="Enter an email to sign in with DIMO on"
        subtitle={
          document.referrer
            ? new URL(document.referrer).hostname
            : "https://dimo.org"
        }
      />
      <div
        className="frame9 flex flex-col items-center"
        style={{ gap: "20px" }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="p-2 border border-gray-300 rounded-md w-[440px]"
        />
        <PrimaryButton onClick={handleSubmit} width="w-[440px]">
          Authenticate
        </PrimaryButton>
      </div>
    </Card>
  );
};

export default EmailInput;
