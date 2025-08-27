import { UiStates } from '../enums';

export interface BaseParams {
  clientId: `0x${string}` | null;
  redirectUri: string;
  waitingForParams: boolean;
  waitingForDevLicense: boolean;
  apiKey: string;
  utm: string;
  entryState?: UiStates;
  altTitle?: boolean;
  forceEmail?: boolean;
  configCID?: string;
  newVehicleSectionDescription: string;
  shareVehiclesSectionDescription: string;
}

export interface FetchedParams {
  devLicenseAlias: string;
  invalidCredentials: boolean;
}

export interface VehicleManagerParams {
  permissionTemplateId: string;
  permissions: string;
  vehicleTokenIds: string[];
  vehicleMakes: string[];
  expirationDate: BigInt;
  powertrainTypes: string[];
  region?: string;
  onboarding?: string;
}


export interface TransactionParams {
  address: `0x${string}`
  value?: bigint
  abi: any
  functionName: string
  args: any[]
}

export interface AdvancedTransactionParams {
  transactionData: TransactionParams;
}
export type AllParams = BaseParams &
  FetchedParams &
  Partial<VehicleManagerParams & AdvancedTransactionParams>;

export type VehicleManagerMandatoryParams = BaseParams &
  FetchedParams &
  VehicleManagerParams;

export type AdvancedTransactionMandatoryParams = BaseParams &
  FetchedParams &
  AdvancedTransactionParams;
