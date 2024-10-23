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
  fetchUserDetails,
  sendOtp,
  verifyOtp,
} from "../services/accountsService"; // Import the service functions
import { authenticateUser } from "../utils/authUtils";
import { UserObject } from "../models/user";

interface AuthContextProps {
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
    onSuccess: (token: string) => void
  ) => void;
  user: UserObject | null;
  loading: boolean; // Add loading state to context
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// AuthProvider component to provide the context
export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (
    email: string
  ): Promise<{ success: boolean; otpId?: string; error?: string }> => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendOtp(email); // Call the updated sendOtp service
      if (result.success && result.otpId) {
        console.log(`OTP sent to ${email}, OTP ID: ${result.otpId}`);
        return { success: true, otpId: result.otpId };
      }

      console.log(`OTP sent to ${email}`);
      return { success: false };
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
    onSuccess: (token: string) => void
  ) => {
    setLoading(true);
    setError(null);

    try {
      const userDetailsResponse = await fetchUserDetails(email);
      if (!userDetailsResponse.success || !userDetailsResponse.user) {
        throw new Error("Failed to fetch user details");
      }
      const user = userDetailsResponse.user;
      console.log(user);
      setUser(user); // Store the user object in the context
      authenticateUser(email, (token) => {
        onSuccess(token);
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        sendOtp: handleSendOtp,
        verifyOtp: handleVerifyOtp,
        authenticateUser: handleAuthenticateUser,
        loading,
        user,
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
