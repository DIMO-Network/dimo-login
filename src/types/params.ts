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

export interface AccountManagerParams {
  permissionTemplateId: string;
  permissions: string;
  expirationDate: BigInt;
  region?: string;
}

export interface PermissionScopeParams {
  permissionScope?: 'vehicle' | 'account' | 'both';
  vehiclePermissions?: string;
  vehiclePermissionTemplateId?: string;
  accountPermissions?: string;
  accountPermissionTemplateId?: string;
}

export interface TransactionParams {
  address: `0x${string}`;
  value?: bigint;
  abi: any;
  functionName: string;
  args: any[];
}

export interface AdvancedTransactionParams {
  transactionData: TransactionParams;
}
export type AllParams = BaseParams &
  FetchedParams &
  Partial<VehicleManagerParams & AccountManagerParams & AdvancedTransactionParams & PermissionScopeParams>;

export type VehicleManagerMandatoryParams = BaseParams &
  FetchedParams &
  VehicleManagerParams;

export type AccountManagerMandatoryParams = BaseParams &
  FetchedParams &
  AccountManagerParams;

export type AdvancedTransactionMandatoryParams = BaseParams &
  FetchedParams &
  AdvancedTransactionParams;
