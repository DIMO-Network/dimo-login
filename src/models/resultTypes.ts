// src/types/resultTypes.ts

import { UserObject } from './user';

type SubmitChallengeResponse = {
  access_token: string;
};

type SubmitCodeExchangeResponse = {
  access_token: string;
};

type GenerateChallengeResponse = {
  challenge: string;
  state: string;
};

type MintVehicleResponse = {
  userOperationHash: string;
  tokenId: string;
};

type SubmitAuthCodeResponse = {
  vehicles: ExternalVehicleData[];
};

// Each vehicle has its own data
type ExternalVehicleData = {
  externalId: string;
  vin: string; // Some vehicles might not have a VIN
  definition: {
    make: string;
    model: string;
    year: number;
    id: string; // Device Definition ID
  };
};

type IntegrationInfoResponse = {
  status: string;
  externalId: string;
  createdAt: string;
  tesla?: {
    virtualKeyAdded: boolean;
    telemtrySubscribed: boolean;
    virtualKeyStatus: string;
    apiVersion: number;
    missingRequiredScopes: string[];
  };
};

export type PasskeyCreationResult = [attestation: any, challenge: string];

// Generalized Result Type
export type Result<T> = { success: true; data: T } | { success: false; error: string };

// Specific Result Types
export type UserResult = Result<{ user: UserObject }>;
export type OtpResult = Result<{ otpId: string }>;
export type CredentialResult = { credentialBundle: string };
export type SimpleResult = Result<null>;
export type SimpleDataResult<T = null> = Result<T>;
export type GenerateChallengeResult = Result<GenerateChallengeResponse>;
export type MintVehicleResult = Result<MintVehicleResponse>;
export type SubmitChallengeResult = Result<SubmitChallengeResponse>;
export type SubmitCodeExchangeResult = Result<SubmitCodeExchangeResponse>;
export type SubmitAuthCodeResult = Result<SubmitAuthCodeResponse>; //TODO: Specification could be useful here
export type IntegrationInfoResult = Result<IntegrationInfoResponse>; //TODO: Only for tesla right now
