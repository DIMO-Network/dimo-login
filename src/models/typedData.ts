interface TypedDataField {
  name: string;
  type: string;
}

interface TypedDataTypes {
  [key: string]: TypedDataField[];
}

interface TypedDataDomain {
  chainId: string; // Assuming it's an object
  name: string;
  salt: string;
  verifyingContract: string;
  version: string;
}

interface TypedDataMessage {
  attributes: string[];
  deviceDefinitionId: string;
  infos: string[];
  manufacturerNode: string;
  owner: string;
}

export interface TypedData {
  domain: TypedDataDomain;
  message: TypedDataMessage;
  primaryType: string;
  types: TypedDataTypes;
}

export interface TypedDataResponse {
  success: boolean;
  data?: MintVehicleNft | IntegrationNft;
  error?: string;
}


export type NftTypeElements = Array<{
  name: string;
  type: string;
}>;

export type NftTypes = Record<string, NftTypeElements>;

export interface NftDomain {
  name: string;
  version: string;
  chainId: string | number;
  verifyingContract: string;
  salt: string;
}

export interface IntegrationMessage {
  attributes: string[];
  infos: string[];
  manufacturerNode: string;
  owner: string;
}

export interface MintVehicleMessage {
  attributes: string[];
  infos: string[];
  manufacturerNode: string;
  owner: string;
  deviceDefinitionId: string;
}

type DimoNftMessage = Record<string, any>;

export type IntegrationNft = DimoNft<IntegrationMessage>;
export type MintVehicleNft = DimoNft<MintVehicleMessage>;

export interface DimoNft<T extends DimoNftMessage> {
  types: NftTypes;
  primaryType: string;
  domain: NftDomain;
  message: T;
}