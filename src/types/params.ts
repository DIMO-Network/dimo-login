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
  /**
   * Brand the relying party selected, forwarded by the SDK — a URL query param
   * in redirect mode, a field on the AUTH_INIT message in popup mode. Keys the
   * console-api brand lookup (`clientId + brandName`) to a specific OEM instead
   * of the license default. `clientId`-scoped server-side, so a site can only
   * select among brands it owns.
   */
  brandName?: string | null;
  /** Custom Terms of Service URL supplied by the relying party. When set, the
   * legal notice swaps the default DIMO ToS link for this URL. */
  tosUrl?: string;
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
