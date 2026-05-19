import { UiStates } from '../enums';
import { OemBrand } from '../services/brandService';
import { CloudEventAgreement } from './permissions';

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
  /**
   * OEM brand record fetched from console-api keyed on `clientId`. Drives the
   * Header logo + title + document.title. `null` while still loading or if
   * no brand is configured for this license; the UI falls back to default
   * DIMO chrome.
   */
  oemBrand: OemBrand | null;
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
  cloudEvent?: CloudEventAgreement;
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

export interface SignMessageData {
  message: string;
  isHex: boolean;
}

export interface SignMessageParams {
  messageData: SignMessageData;
}

export type AllParams = BaseParams &
  FetchedParams &
  Partial<VehicleManagerParams & AdvancedTransactionParams & SignMessageParams>;

export type VehicleManagerMandatoryParams = BaseParams &
  FetchedParams &
  VehicleManagerParams;

export type AdvancedTransactionMandatoryParams = BaseParams &
  FetchedParams &
  AdvancedTransactionParams;

export type SignMessageMandatoryParams = BaseParams & FetchedParams & SignMessageParams;
