// src/types/resultTypes.ts

import { UserObject } from "./user";

// Generalized Result Type
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Specific Result Types
export type UserResult = Result<{ user: UserObject }>;
export type OtpResult = Result<{ otpId: string }>;
export type CredentialResult = Result<{ credentialBundle: string }>;
export type SimpleResult = Result<null>;
