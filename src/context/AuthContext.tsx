import React, { createContext, useContext, ReactNode, useState, ReactElement } from "react";
import {authenticateUser, buildAuthPayload, sendAuthPayloadToParent} from "../utils/authUtils";
import { createAccount, sendOtp, verifyOtp } from "../services/accountsService";
import { CreateAccountParams } from "../models/account";
import { createPasskey } from "../services/turnkeyService";
import { CredentialResult, OtpResult, UserResult } from "../models/resultTypes";
import { useDevCredentials } from "./DevCredentialsContext";
import { UserObject } from "../models/user";
import {UiStates, useUIManager} from "./UIManagerContext";
import {storeJWTInCookies, storeUserInLocalStorage} from "../services/storageService";
import {backToThirdParty} from "../utils/messageHandler";

interface AuthContextProps {
  createAccountWithPasskey: (email: string) => Promise<UserResult>;
  sendOtp: (email: string) => Promise<OtpResult>;
  verifyOtp: (email: string, otp: string) => Promise<CredentialResult>;
  authenticateUser: (
    email: string,
  ) => Promise<void>;
  user: UserObject;
  setUser: React.Dispatch<React.SetStateAction<UserObject>>;
  jwt: string;
  setJwt: React.Dispatch<React.SetStateAction<string>>;
  userInitialized: boolean;
  setUserInitialized: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const defaultUser: UserObject = {
  email: "",
  smartContractAddress: "",
  subOrganizationId: "",
  hasPasskey: false,
  walletAddress: "",
  emailVerified: false,
};

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => {
  const [user, setUser] = useState<UserObject>(defaultUser);
  const [otpId, setOtpId] = useState<string>("");
  const [jwt, setJwt] = useState<string>("");
  const [userInitialized, setUserInitialized] = useState<boolean>(false);
  const { clientId, apiKey, redirectUri, utm } = useDevCredentials();
  const { setLoadingState, error, setError, setUiState, entryState } = useUIManager();

  const createAccountWithPasskey = async (
    email: string
  ): Promise<UserResult> => {
    setLoadingState(true, "Creating account", true);
    setError(null);
    if (!apiKey) {
      return {
        success: false,
        error: "API key is required for account creation",
      };
    }

    try {
      // Create passkey and get attestation
      const [attestation, challenge] = await createPasskey(email);

      // Trigger account creation request
      const accountCreationParams: CreateAccountParams = {
        email,
        apiKey,
        attestation: attestation as object,
        challenge: challenge as string,
        deployAccount: true,
      };
      const account = await createAccount(accountCreationParams);

      if (account.success && account.data.user) {
        setUser(account.data.user); // Store the user object in the context
        return { success: true, data: { user: account.data.user } };
      } else {
        throw new Error("Failed to create account");
      }
    } catch (error) {
      setError(
        "Failed to create account, please try again or contact support."
      );
      return { success: false, error: error as string };
    } finally {
      setLoadingState(false);
    }
  };

  const handleSendOtp = async (email: string): Promise<OtpResult> => {
    setLoadingState(true, "Sending OTP", true);
    setError(null);

    if (!apiKey) {
      return {
        success: false,
        error: "API key is to send an OTP",
      };
    }

    try {
      // Try sending OTP first
      let otpResult = await sendOtp(email, apiKey);
      if (!otpResult.success) {
        // If sending OTP fails, attempt account creation and retry OTP
        const accountCreation = await createAccountWithPasskey(email);
        if (!accountCreation.success)
          throw new Error("Account creation failed during OTP setup.");

        // Retry sending OTP after successful account creation
        otpResult = await sendOtp(email, apiKey);
        if (!otpResult.success)
          throw new Error("Failed to send OTP after account creation.");
      }

      setOtpId(otpResult.data.otpId);
      console.log(`OTP sent to ${email}, OTP ID: ${otpResult.data.otpId}`);
      return { success: true, data: { otpId: otpResult.data.otpId } };
    } catch (err) {
      setError("Failed to send OTP");
      console.error(err);
      return { success: false, error: error as string };
    } finally {
      setLoadingState(false);
    }
  };

  const handleVerifyOtp = async (
    email: string,
    otp: string
  ): Promise<CredentialResult> => {
    setLoadingState(true, "Verifying OTP", true);
    setError(null);
    try {
      const result = await verifyOtp(email, otp, otpId);
      if (result.success && result.data.credentialBundle) {
        console.log(`OTP verified for ${email}`);
        return {
          success: true,
          data: { credentialBundle: result.data.credentialBundle },
        };
      } else {
        throw new Error("Invalid OTP");
      }
    } catch (err) {
      setError("Invalid code. Try again.");
      console.error(err);
      return { success: false, error: err as string };
    } finally {
      setLoadingState(false);
    }
  };

  const persistAccountData = (account: UserObject, accessToken: string) => {
    storeJWTInCookies(clientId, accessToken);
    storeUserInLocalStorage(clientId, account);
  }

  const handleSuccessfulAuthentication = (account: UserObject, accessToken: string) => {
    if (entryState === UiStates.EMAIL_INPUT) {
      const authPayload = buildAuthPayload(
        clientId,
        accessToken,
        account
      );
      sendAuthPayloadToParent(authPayload, redirectUri, (payload) => {
        backToThirdParty(payload, redirectUri, utm);
        setUiState(UiStates.SUCCESS); //For Embed Mode
      });
    } else if (entryState === UiStates.VEHICLE_MANAGER) {
      //Note: If the user is unauthenticated but the vehicle manager is the entry state, the payload will be sent to parent in the vehicle manager, after vehicles are shared
      setUiState(UiStates.VEHICLE_MANAGER); //Move to vehicle manager
    } else if (entryState === UiStates.ADVANCED_TRANSACTION) {
      setUiState(UiStates.ADVANCED_TRANSACTION);
    }
  }

  const handleAuthenticateUser = async (
    email: string,
  ) => {
    setLoadingState(true, "Authenticating User");
    setError(null);
    try {
      if (!user || !user.subOrganizationId) {
        throw new Error("No user has been set in state yet.");
      }

      if (!clientId || !redirectUri) {
        throw new Error("Developer license credentials have not been set.");
      }

      const {account, accessToken} = await authenticateUser({
        email,
        clientId,
        redirectUri,
        utm,
        subOrganizationId: user.subOrganizationId,
      });
      setJwt(accessToken);
      setUser(account);
      persistAccountData(account, accessToken);
      handleSuccessfulAuthentication(account, accessToken);
    } catch (error: unknown) {
      console.error(error);
      setError(
        "Could not authenticate user, please verify your passkey and try again."
      );
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        createAccountWithPasskey,
        sendOtp: handleSendOtp,
        verifyOtp: handleVerifyOtp,
        authenticateUser: handleAuthenticateUser,
        user,
        setUser,
        jwt,
        setJwt,
        userInitialized,
        setUserInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use the AuthContext
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
