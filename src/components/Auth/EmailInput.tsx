// components/Auth/EmailInput.tsx
import React, { useEffect, useState } from "react";

import { Card } from "../Shared/Card";
import { Checkbox } from "../Shared/Checkbox";
import { fetchUserDetails } from "../../services/accountsService";
import { Header } from "../Shared/Header";
import { PrimaryButton } from "../Shared/PrimaryButton";
import { setEmailGranted } from "../../services/storageService";
import { useAuthContext } from "../../context/AuthContext";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import { UiStates, useUIManager } from "../../context/UIManagerContext";

import ErrorMessage from "../Shared/ErrorMessage";

interface EmailInputProps {
  onSubmit: (email: string) => void;
  setOtpId: (otpId: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ onSubmit, setOtpId }) => {
  const { authenticateUser, setUser } = useAuthContext(); // Get sendOtp from the context

  const { clientId, devLicenseAlias } = useDevCredentials();
  const { setUiState, entryState, error } = useUIManager();

  const [email, setEmail] = useState("");
  const [triggerAuth, setTriggerAuth] = useState(false);
  const [emailPermissionGranted, setEmailPermissionGranted] = useState(false);

  const appUrl = new URL(
    document.referrer ? document.referrer : "https://dimo.org"
  );

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
    setUiState(UiStates.PASSKEY_GENERATOR, { setBack: true });
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
        <Checkbox
          onChange={() => {
            setEmailPermissionGranted(!emailPermissionGranted);
          }}
          name="share-email"
          id="share-email"
          className="mr-2"
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
        <p className="flex flex-inline gap-1 text-xs text-gray-500">
          By continuing you agree to our
          <a href="https://dimo.org/legal/privacy-policy" className="underline">
            Privacy Policy
          </a>
          and
          <a href="https://dimo.org/legal/terms-of-use" className="underline">
            Terms of Service
          </a>
        </p>
      </div>
    </Card>
  );
};

export default EmailInput;
