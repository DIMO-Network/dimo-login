import { CredentialResult, OtpResult, UserResult } from '@models/resultTypes';
import { UserObject } from '@models/user';
import React from 'react';

export interface AuthContextProps {
  createAccountWithPasskey: (email: string) => Promise<UserResult>;
  sendOtp: (email: string) => Promise<OtpResult>;
  verifyOtp: (email: string, otp: string) => Promise<CredentialResult>;
  authenticateUser: (
    email: string,
    credentialBundle: string,
    entryState: string
  ) => Promise<void>;
  user: UserObject;
  setUser: React.Dispatch<React.SetStateAction<UserObject>>;
  jwt: string;
  setJwt: React.Dispatch<React.SetStateAction<string>>;
  userInitialized: boolean;
  setUserInitialized: React.Dispatch<React.SetStateAction<boolean>>;
}
