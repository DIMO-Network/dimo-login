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
