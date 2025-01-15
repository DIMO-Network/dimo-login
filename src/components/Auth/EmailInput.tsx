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
import { useUIManager } from "../../context/UIManagerContext";

import ErrorMessage from "../Shared/ErrorMessage";
import { submitCodeExchange } from "../../services/authService";
import { decodeJwt } from "../../utils/jwtUtils";

interface EmailInputProps {
  onSubmit: (email: string) => void;
  setOtpId: (otpId: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ onSubmit, setOtpId }) => {
  const { authenticateUser, setUser } = useAuthContext(); // Get sendOtp from the context

  const { clientId, devLicenseAlias, redirectUri } = useDevCredentials();
  const { setUiState, entryState, error, setLoadingState, setComponentData } =
    useUIManager();

  const [email, setEmail] = useState("");
  const [triggerAuth, setTriggerAuth] = useState(false);
  const [emailPermissionGranted, setEmailPermissionGranted] = useState(false);
  const [tokenExchanged, setTokenExchanged] = useState(false);

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
    setUiState("PASSKEY_GENERATOR");
  };

  const handleEmail = async (email: string) => {
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
    setUiState("PASSKEY_GENERATOR");
  };

  const handleKeyDown = (e: { key: string }) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleGoogleAuth = () => {
    const stateParams = {
      clientId,
      redirectUri,
      entryState,
      referrer: document.referrer, // Pass referrer to state

    };
    const serializedState = JSON.stringify(stateParams);
    const encodedState = encodeURIComponent(serializedState);

    const url = `https://auth.dev.dimo.zone/auth/google?client_id=login-with-dimo&redirect_uri=https://login.dev.dimo.org&response_type=code&scope=openid%20email&state=${encodedState}`;

    window.location.href = url;
  };

  const handleAppleAuth = () => {
    const url = `https://auth.dev.dimo.zone/auth/apple?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email`;
    window.location.href = url;
  };

  useEffect(() => {
    // Only authenticate if `user` is set and authentication hasn't been triggered
    if (triggerAuth) {
      authenticateUser(email, "credentialBundle", entryState);
    }
  }, [triggerAuth]);

  useEffect(() => {
    const fetchData = () => {
      setLoadingState(true, "Loading....");
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get("code");

      if (codeFromUrl) {
        submitCodeExchange({
          clientId: "login-with-dimo",
          redirectUri: "https://login.dev.dimo.org",
          code: codeFromUrl,
        }).then((result) => {
          if (result.success) {
            const access_token = result.data.access_token;
            const decodedJwt = decodeJwt(access_token);
            if (decodedJwt) {
              setTokenExchanged(true);
              setEmail(decodedJwt.email);
              setComponentData({ emailValidated: decodedJwt.email });
              handleEmail(decodedJwt.email);
            }
          }
        });
      } else {
        setTokenExchanged(true);
      }
      setLoadingState(false);
      // try {
      //   const urlParams = new URLSearchParams(window.location.search);
      //   const codeFromUrl = urlParams.get("code");

      //   if (codeFromUrl) {
      //     const result = await submitCodeExchange({
      //       clientId: "login-with-dimo",
      //       redirectUri: "https://login.dev.dimo.org",
      //       code: codeFromUrl,
      //     });

      //     if (result.success) {
      //       const access_token = result.data.access_token;
      //       const decodedJwt = decodeJwt(access_token);

      //       if (decodedJwt) {
      //         setEmail(decodedJwt.email);
      //         setComponentData({ emailValidated: decodedJwt.email });
      //         handleEmail(decodedJwt.email);
      //       }
      //     }
      //   }
      // } catch (error) {
      //   console.error("Error during code exchange:", error);
      // }
      // setLoadingState(false);
    };

    if (!tokenExchanged) {
      fetchData();
    }
  }, [tokenExchanged]);

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

        <div>
          <button onClick={handleGoogleAuth}>Google Auth</button>
          <button onClick={handleAppleAuth}>Apple Auth</button>
        </div>
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
