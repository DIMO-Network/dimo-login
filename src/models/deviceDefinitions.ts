export interface VehicleCreateRequest {
  countryCode: string;
  deviceDefinitionId: string;
}

export interface DecodeVinRequest {
  countryCode: string;
  vin: string;
}

export interface DeviceDefinitionResponse {
  success: boolean;
  data?: {
    deviceDefinitionId: string;
    newTransactionHash?: string;
  };
  error?: string;
}

export interface DeviceDefinitionSearchRequest {
  query: string;
  makeSlug?: string;
  modelSlug?: string;
  year?: number;
  page?: number;
  pageSize?: number;
}

export interface DeviceDefinition {
  id: string;
  legacy_ksuid?: string;
  name: string;
  make: string;
  model: string;
  year: number;
  imageUrl?: string;
}

export interface DeviceDefinitionSearchResponse {
  success: boolean;
  data?: DeviceDefinition;
  error?: string;
}

export interface DeviceAttribute {
  name: string;
  value: string | null;
}

export interface CompatibleIntegration {
  id: string;
  type: string;
  style: string;
  vendor: string;
  region: string;
  country: string;
  capabilities: any; // Can be refined if structure is known
}

export interface Make {
  id: string;
  name: string;
  logo_url: string;
  oem_platform_name: string;
}

export interface DeviceDefinitionType {
  type: string;
  make: string;
  model: string;
  year: number;
  subModels: any | null; // Can be refined if structure is known
}

export interface UserDeviceMetadata {
  powertrainType: string;
  postal_code: string | null;
  geoDecodedCountry: string | null;
  geoDecodedStateProv: string | null;
}

export interface UserDevice {
  id: string;
  vin: string | null;
  vinConfirmed: boolean;
  name: string | null;
  customImageUrl: string | null;
  deviceDefinition: DeviceDefinitionExtended;
  countryCode: string;
  integrations: any | null; // Can be refined if structure is known
  metadata: UserDeviceMetadata;
  optedInAt: string | null;
  privilegedUsers: any | null; // Can be refined if structure is known
}

export interface GetUserDeviceResponse {
  success: boolean;
  data?: { userDevice: UserDevice };
  error?: string;
}

export interface DeviceDefinitionExtended {
  deviceDefinitionId: string;
  name: string;
  imageUrl: string;
  make: Make;
  compatibleIntegrations: CompatibleIntegration[];
  type: DeviceDefinitionType;
  vehicleData: Record<string, any>; // Can be refined if structure is known
  deviceAttributes: DeviceAttribute[];
  metadata: any | null;
  verified: boolean;
  definitionId: string;
}

export interface GetMintPayloadRequest {
  userDeviceID: string;
  integrationID: string;
}

interface SacdInput {
  expiration: number;
  grantee: string;
  permissions: number;
  source: string;
}

export interface MintNftRequest {
  imageData: string;
  imageDataTransparent: string;
  sacdInput: SacdInput;
  signature: string;
}

export interface SubmitAuthCodeRequest {
  authorizationCode: string;
  redirectUri: string;
}

export interface RegisterIntegrationRequest {
  userDeviceId: string;
  integrationId: string;
  externalId: string;
}

export interface GetIntegrationInfoRequest {
  userDeviceId: string;
  integrationId: string;
}
