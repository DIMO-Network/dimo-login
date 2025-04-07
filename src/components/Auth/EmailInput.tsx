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
import { AuthProvider, constructAuthUrl } from "../../utils/authUrls";
import { getSignInTitle } from "../../utils/uiUtils";
import { useOracles } from "../../context/OraclesContext";

interface EmailInputProps {
  onSubmit: (email: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ onSubmit }) => {
  // 1️⃣ Authentication & User Context
  const { authenticateUser, setUser } = useAuthContext();

  // 2️⃣ Developer Credentials
  const { clientId, devLicenseAlias, redirectUri } = useDevCredentials();

  // 3️⃣ UI State Management
  const {
    setUiState,
    entryState,
    error,
    setError,
    setComponentData,
    altTitle,
  } = useUIManager();

  //Oracle Management
  const { onboardingEnabled } = useOracles();

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

  const handleAuth = (provider: AuthProvider) => {
    if (forceEmail && !emailPermissionGranted) {
      setError("Email sharing is required to proceed. Please check the box.");
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const authUrl = constructAuthUrl({
      provider,
      clientId,
      redirectUri,
      entryState: UiStates.CONNECT_TESLA,
      expirationDate: urlParams.get("expirationDate"),
      permissionTemplateId: urlParams.get("permissionTemplateId"),
      utm: urlParams.getAll("utm"),
      vehicleMakes: urlParams.getAll("vehicleMakes"),
      vehicles: urlParams.getAll("vehicles"),
      onboarding: onboardingEnabled ? ["tesla"] : [], //TODO: Should have full onboarding array here
      altTitle,
    });

    window.location.href = authUrl;
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
      className="flex flex-col items-center"
    >
      <div className="flex flex-col gap-6 w-[440px]">
        <Header
          title={getSignInTitle(devLicenseAlias, {
            altTitle: Boolean(altTitle),
          })}
          subtitle={appUrl.hostname}
          link={`${appUrl.protocol}//${appUrl.host}`}
        />
        {error && <ErrorMessage message={error} />}
        <div className="flex w-full justify-center items-center">
          <label
            htmlFor="share-email"
            className="flex justify-center items-center text-sm mb-4 cursor-pointer"
          >
            <Checkbox
              onChange={() => {
                setEmailPermissionGranted(!emailPermissionGranted);
              }}
              name="share-email"
              id="share-email"
              className="mr-2"
              checked={emailPermissionGranted}
            />
            I agree to share my email with {devLicenseAlias}
          </label>
        </div>
        <div
          onKeyDown={handleKeyDown} // Listen for key presses
          className="frame9 flex flex-col items-center gap-[10px] w-full"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="p-2 border border-gray-300 rounded-md w-full"
          />
          <PrimaryButton onClick={handleSubmit} width="w-full">
            Continue
          </PrimaryButton>

          {/* Flex wrap is only applied on smaller screens, ensuring buttons stay side by side when possible */}
          <div className="flex flex-wrap sm:flex-nowrap justify-between gap-3 w-full">
            <button
              onClick={handleGoogleAuth}
              className="flex items-center justify-center gap-2 w-full sm:max-w-[210px] h-[40px] rounded-full border border-gray-300 bg-white text-black text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <GoogleIcon />
              Sign in with Google
            </button>

            <button
              onClick={handleAppleAuth}
              className="flex items-center justify-center gap-2 w-full sm:max-w-[210px] h-[40px] rounded-full border border-gray-300 bg-white text-black text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <AppleIcon />
              Sign in with Apple
            </button>
          </div>

          <p className="flex flex-wrap justify-center text-center text-xs text-gray-500">
            By continuing you agree to our&nbsp;
            <a
              href="https://dimo.org/legal/privacy-policy"
              className="underline whitespace-nowrap"
            >
              Privacy Policy
            </a>
            &nbsp;and&nbsp;
            <a
              href="https://dimo.org/legal/terms-of-use"
              className="underline whitespace-nowrap"
            >
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </Card>
  );
};

export default EmailInput;
