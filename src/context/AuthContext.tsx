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

interface AuthContextProps {
  createAccountWithPasskey: (
    email: string
  ) => Promise<{ success: boolean; user?: UserObject; error?: string }>;
  sendOtp: (
    email: string
  ) => Promise<{ success: boolean; otpId?: string; error?: string }>;
  verifyOtp: (
    email: string,
    otp: string,
    otpId: string
  ) => Promise<{ success: boolean; credentialBundle?: string; error?: string }>;
  authenticateUser: (
    email: string,
    credentialBundle: string,
    setJwt: (jwt: string) => void,
    setAuthStep: (step: number) => void
  ) => void;
  user: UserObject | undefined;
  setUser: React.Dispatch<React.SetStateAction<UserObject | undefined>>;
  loading: boolean; // Add loading state to context
  jwt: string | undefined;
  setJwt: React.Dispatch<React.SetStateAction<string | undefined>>;
  authStep: number;
  setAuthStep: React.Dispatch<React.SetStateAction<number>>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// AuthProvider component to provide the context
export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserObject | undefined>(undefined);
  const [jwt, setJwt] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<number>(0); // 0 = Email Input, 1 = Loading, 2 = Success
  const { clientId, apiKey, redirectUri, permissionTemplateId } =
    useDevCredentials();

  const createAccountWithPasskey = async (email: string) => {
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
      if (account.success && account.user) {
        setUser(account.user); // Store the user object in the context
        return { success: true, user: account.user };
      } else {
        throw new Error("Failed to create account");
      }
    } catch (error) {
      console.error("Account creation failed:", error);
      return { success: false };
    }
  };

  const handleSendOtp = async (
    email: string
  ): Promise<{ success: boolean; otpId?: string; error?: string }> => {
    setLoading(true);
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

      console.log(`OTP sent to ${email}, OTP ID: ${otpResult.otpId}`);
      return { success: true, otpId: otpResult.otpId };
    } catch (err) {
      setError("Failed to send OTP");
      console.error(err);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (
    email: string,
    otp: string,
    otpId: string
  ): Promise<{
    success: boolean;
    credentialBundle?: string;
    error?: string;
  }> => {
    setLoading(true);
    setError(null);
    try {
      const result = await verifyOtp(email, otp, otpId);
      if (result.success && result.credentialBundle) {
        console.log(`OTP verified for ${email}`);
        return { success: true, credentialBundle: result.credentialBundle };
      } else {
        throw new Error("Invalid OTP");
      }
    } catch (err) {
      setError("Failed to verify OTP");
      console.error(err);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticateUser = async (
    email: string,
    credentialBundle: string,
    setJwt: (jwt: string) => void,
    setAuthStep: (step: number) => void
  ) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("No user found");
      }

      if ( !clientId || !redirectUri ) {
        throw new Error("Developer credentials not found");
      }

      await authenticateUser(
        email,
        clientId,
        redirectUri,
        user.subOrganizationId,
        user.walletAddress,
        user.smartContractAddress,
        setJwt,
        setAuthStep,
        permissionTemplateId
      ); //TODO: Better handling of null
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        createAccountWithPasskey,
        sendOtp: handleSendOtp,
        verifyOtp: handleVerifyOtp,
        authenticateUser: handleAuthenticateUser,
        loading,
        user,
        setUser,
        jwt,
        setJwt,
        authStep,
        setAuthStep,
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
