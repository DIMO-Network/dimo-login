// src/types/resultTypes.ts

import { UserObject } from "./user";

type SubmitChallengeResponse = {
  access_token: string;
};

type GenerateChallengeResponse = {
  challenge: string;
  state: string;
};

// Generalized Result Type
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Specific Result Types
export type UserResult = Result<{ user: UserObject }>;
export type OtpResult = Result<{ otpId: string }>;
export type CredentialResult = Result<{ credentialBundle: string }>;
export type SimpleResult = Result<null>;
export type SimpleDataResult<T = null> = Result<T>;
export type GenerateChallengeResult = Result<GenerateChallengeResponse>;
export type SubmitChallengeResult = Result<SubmitChallengeResponse>;