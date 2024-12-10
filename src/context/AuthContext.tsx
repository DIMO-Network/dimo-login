/**
 * AuthContext.tsx
 * 
 * This file provides the AuthContext and AuthProvider, which manage global authentication 
 * state in the application. It can be used to store and access the user's authentication 
 * status, user data, and login/logout functions across the entire application.
 * 
 * Context:
 * - sendOtp method (to be used by OtpInput component)
 * - verifyOtp method (to be used by OtpInput component)
 * - authenticateUser method (to be used by OtpInput component)
 * - loading (to be used by email and otp input)
 * 
 * Usage:
 * Wrap the application or a part of it with the AuthProvider to make the authentication 
 * state available across the app. Use the useAuthContext hook to access the authentication 
 * state and functions.

 */

import React, { createContext, useContext, ReactNode, useState } from "react";
import {
  createAccount,
  fetchUserDetails,
  sendOtp,
  verifyOtp,
} from "../services/accountsService"; // Import the service functions
import { authenticateUser } from "../utils/authUtils";
import { UserObject } from "../models/user";
import { createPasskey } from "../services/turnkeyService";
import { useDevCredentials } from "./DevCredentialsContext";
import { CredentialResult, OtpResult, UserResult } from "../models/resultTypes";
import { useUIManager } from "./UIManagerContext";

interface AuthContextProps {
  createAccountWithPasskey: (email: string) => Promise<UserResult>;
  sendOtp: (email: string) => Promise<OtpResult>;
  verifyOtp: (
    email: string,
    otp: string,
    otpId: string
  ) => Promise<CredentialResult>;
  authenticateUser: (
    email: string,
    credentialBundle: string,
    entryState: string,
    setJwt: (jwt: string) => void,
    setUiState: (step: string) => void
  ) => void;
  user: UserObject | undefined;
  setUser: React.Dispatch<React.SetStateAction<UserObject | undefined>>;
  jwt: string | undefined;
  setJwt: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// AuthProvider component to provide the context
export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [user, setUser] = useState<UserObject | undefined>(undefined);
  const [jwt, setJwt] = useState<string | undefined>(undefined);
  const { clientId, apiKey, redirectUri } = useDevCredentials();
  const { setLoadingState, error, setError } = useUIManager();

  const createAccountWithPasskey = async (
    email: string
  ): Promise<UserResult> => {
    setLoadingState(true,"Creating account");
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
      const account = await createAccount(
        email,
        apiKey,
        attestation as object,
        challenge as string,
        true
      ); //TODO: Better handling of types
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
    setLoadingState(true,"Sending OTP");
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
    otp: string,
    otpId: string
  ): Promise<CredentialResult> => {
    setLoadingState(true, "Verifying OTP");
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

  const handleAuthenticateUser = async (
    email: string,
    credentialBundle: string,
    entryState: string,
    setJwt: (jwt: string) => void,
    setUiState: (step: string) => void
  ) => {
    setLoadingState(true,"Authenticating User");
    setError(null);

    try {
      if (!user || !user.subOrganizationId) {
        throw new Error("User does not exist");
      }

      if (!clientId || !redirectUri) {
        throw new Error("Developer credentials not found");
      }

      await authenticateUser(
        email,
        clientId,
        redirectUri,
        user?.subOrganizationId,
        entryState,
        setJwt,
        setUiState,
        setUser
      ); //TODO: Better handling of null
    } catch (error) {
      setError(
        "Could not authenticate user, please verify your passkey and try again."
      );
      console.error(error);
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
