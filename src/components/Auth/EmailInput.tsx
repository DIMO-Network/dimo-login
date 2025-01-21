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
import { submitCodeExchange } from "../../services/authService";
import { decodeJwt } from "../../utils/jwtUtils";
import LoadingScreen from "../Shared/LoadingScreen";
import { AppleIcon, GoogleIcon } from "../Icons";
import { isValidEmail } from "../../utils/emailUtils";
import { getForceEmail } from "../../stores/AuthStateStore";
import { getAppUrl } from "../../utils/urlHelpers";

interface EmailInputProps {
  onSubmit: (email: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ onSubmit }) => {
  // 1️⃣ Authentication & User Context
  const { authenticateUser, setUser } = useAuthContext();

  // 2️⃣ Developer Credentials
  const { clientId, devLicenseAlias, redirectUri } = useDevCredentials();

  // 3️⃣ UI State Management
  const { setUiState, entryState, error, setError, setComponentData } =
    useUIManager();

  // 4️⃣ Local State Variables
  const [email, setEmail] = useState(""); // User Input (primary)
  const [isSSO, setIsSSO] = useState(false); // Derived from auth flow
  const [triggerAuth, setTriggerAuth] = useState(false); // Controls authentication flow
  const [emailPermissionGranted, setEmailPermissionGranted] = useState(false); // User consent tracking
  const [tokenExchanged, setTokenExchanged] = useState(false); // Token tracking

  // 5️⃣ Derived Values
  const forceEmail = getForceEmail();

  const appUrl = getAppUrl();

  const processEmailSubmission = async (email: string) => {
    if (!email || !clientId) return;

    onSubmit(email); // Trigger any on-submit actions

    // Check if the user exists and authenticate if they do
    const userExistsResult = await fetchUserDetails(email); //TODO: This should be in Auth Context, so that user is set by auth context
    if (userExistsResult.success && userExistsResult.data.user) {
      setUser(userExistsResult.data.user); // Sets initial user from API Response
      setTriggerAuth(true); // Trigger authentication for existing users
      return true; // Indicate that the user exists
    }

    // If user doesn't exist, create an account and send OTP
    setUiState(UiStates.PASSKEY_GENERATOR, { setBack: true });
    return false; // Indicate that the user does not exist
  };

  const handleSubmit = async () => {
    if (!email || !isValidEmail(email)) {
      setError("Please enter a valid email");
      return;
    }

    if (forceEmail && !emailPermissionGranted) {
      setError("Email sharing is required to proceed. Please check the box.");
      return;
    }

    setEmailGranted(clientId, emailPermissionGranted);
    await processEmailSubmission(email);
  };

  const handleEmail = async (email: string) => {
    await processEmailSubmission(email);
  };

  const handleKeyDown = (e: { key: string }) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleAuth = (provider: string) => {
    if (forceEmail && !emailPermissionGranted) {
      setError("Email sharing is required to proceed. Please check the box.");
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);

    const stateParams = {
      clientId,
      emailPermissionGranted,
      entryState,
      expirationDate: urlParams.get("expirationDate"),
      permissionTemplateId: urlParams.get("permissionTemplateId"),
      redirectUri,
      referrer: document.referrer, // Pass referrer to state
      utm: urlParams.getAll("utm"),
      vehicleMakes: urlParams.getAll("vehicleMakes"),
      vehicles: urlParams.getAll("vehicles"),
    };

    const serializedState = JSON.stringify(stateParams);
    const encodedState = encodeURIComponent(serializedState);

    const dimoRedirectUri =
      process.env.REACT_APP_ENVIRONMENT == "prod"
        ? "https://login.dimo.org"
        : "https://login.dev.dimo.org";

    const url = `${process.env.REACT_APP_DIMO_AUTH_URL}/auth/${provider}?client_id=login-with-dimo&redirect_uri=${dimoRedirectUri}&response_type=code&scope=openid%20email&state=${encodedState}`;

    window.location.href = url;
  };

  const handleGoogleAuth = () => handleAuth("google");
  const handleAppleAuth = () => handleAuth("apple");

  useEffect(() => {
    // Only authenticate if `user` is set and authentication hasn't been triggered
    if (triggerAuth) {
      authenticateUser(email, "credentialBundle", entryState);
    }
  }, [triggerAuth]);

  useEffect(() => {
    const fetchData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get("code");

      if (codeFromUrl) {
        setIsSSO(true);
        try {
          const dimoRedirectUri =
            process.env.REACT_APP_ENVIRONMENT == "prod"
              ? "https://login.dimo.org"
              : "https://login.dev.dimo.org";
          const result = await submitCodeExchange({
            clientId: "login-with-dimo",
            redirectUri: dimoRedirectUri,
            code: codeFromUrl,
          });
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
        } catch (error) {
          console.error("Error in code exchange:", error);
        }
      } else {
        setTokenExchanged(true);
      }
    };

    if (!tokenExchanged) {
      fetchData();
    }
  }, [tokenExchanged]);

  if (isSSO && !error) {
    return <LoadingScreen />;
  }

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
          Continue
        </PrimaryButton>

        <div className="flex gap-2">
          <button
            onClick={handleGoogleAuth}
            className="flex items-center justify-center gap-2 w-[216px] h-[40px] rounded-full border border-gray-300 bg-white text-black text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          <button
            onClick={handleAppleAuth}
            className="flex items-center justify-center gap-2 w-[216px] h-[40px] rounded-full border border-gray-300 bg-white text-black text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <AppleIcon />
            Sign in with Apple
          </button>
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
