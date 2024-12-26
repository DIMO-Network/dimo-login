// components/Auth/EmailInput.tsx
import React, { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../../context/AuthContext"; // Use the auth context
import { fetchUserDetails } from "../../services/accountsService";
import ErrorMessage from "../Shared/ErrorMessage";
import PrimaryButton from "../Shared/PrimaryButton";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import { setEmailGranted } from "../../services/storageService";
import { useUIManager } from "../../context/UIManagerContext";

interface EmailInputProps {
  onSubmit: (email: string) => void;
  setOtpId: (otpId: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ onSubmit, setOtpId }) => {
  const {
    sendOtp,
    authenticateUser,
    setUser,
    createAccountWithPasskey,
  } = useAuthContext(); // Get sendOtp from the context

  const { clientId, devLicenseAlias } = useDevCredentials();
  const { setUiState, entryState, error } = useUIManager();

  const [email, setEmail] = useState("");
  const [triggerAuth, setTriggerAuth] = useState(false);
  const [emailPermissionGranted, setEmailPermissionGranted] = useState(false);

  const appUrl = new URL(document.referrer ?? "https://dimo.org");

  const handleOtpSend = async (email: string) => {
    const otpResult = await sendOtp(email); // Send OTP for new account

    if (otpResult.success && otpResult.data.otpId) {
      setOtpId(otpResult.data.otpId); // Store the OTP ID
      setUiState("OTP_INPUT"); // Move to OTP input step
    } else if (!otpResult.success) {
      console.error(otpResult.error); // Handle OTP sending failure
    }
  };

  const handleSubmit = async () => {
    if (!email || !clientId) return;

    onSubmit(email); // Trigger any on-submit actions

    setEmailGranted(clientId, emailPermissionGranted);

    // Check if the user exists and authenticate if they do
    const userExistsResult = await fetchUserDetails(email); //TODO: This should be in Auth Context, so that user is set by auth context
    if (userExistsResult.success && userExistsResult.data.user) {
      setUser(userExistsResult.data.user); //Sets initial user from API Response
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

  const handleKeyDown = (e: { key: string }) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  useEffect(() => {
    // Only authenticate if `user` is set and authentication hasn't been triggered
    if (triggerAuth) {
      authenticateUser(email, "credentialBundle", entryState);
    }
  }, [triggerAuth]);

  return (
    <Card
      width="w-full max-w-[600px]"
      height="h-fit"
      className="flex flex-col gap-6"
    >
      <Header
        title="Enter an email to sign in with DIMO on"
        subtitle={appUrl.hostname}
        link={`${appUrl.protocol}//${appUrl.host}`}
      />
      {error && <ErrorMessage message={error} />}
      <div className="flex justify-center items-center text-sm mb-4">
        <input
          type="checkbox"
          onChange={() => {
            setEmailPermissionGranted(!emailPermissionGranted);
          }}
          className="mr-2 w-5 h-5 text-black border-gray-300 rounded focus:ring-0 focus:ring-offset-0 accent-black"
        />
        I agree to share my email with {devLicenseAlias}
      </div>
      <div
        onKeyDown={handleKeyDown} // Listen for key presses
        className="frame9 flex flex-col items-center gap-[10px]"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="p-2 border border-gray-300 rounded-md w-full lg:w-[440px]"
        />
        <PrimaryButton onClick={handleSubmit} width="w-full lg:w-[440px]">
          Authenticate
        </PrimaryButton>
      </div>
    </Card>
  );
};

export default EmailInput;
