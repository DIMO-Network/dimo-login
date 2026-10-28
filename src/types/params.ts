import { UiStates } from '../enums';
import { OemBrand } from '../services/brandService';
import { CloudEventAgreement } from './permissions';
import type { Language } from '../i18n/language';
import type { EmailRequest } from '../utils/emailRequest';

export interface BaseParams {
  clientId: `0x${string}` | null;
  redirectUri: string;
  waitingForParams: boolean;
  waitingForDevLicense: boolean;
  apiKey: string;
  utm: string;
  entryState?: UiStates;
  altTitle?: boolean;
  /** @deprecated by emailRequest; true means 'required'. */
  forceEmail?: boolean;
  emailRequest?: EmailRequest;
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
  /** Custom Privacy Policy URL supplied by the relying party. When set, the
   * legal notice swaps the default DIMO Privacy Policy link for this URL. */
  privacyPolicyUrl?: string;
  /** Language the app asked for (`en` or `ja`). The user's own pick in the
   * language switcher still wins; see i18n/language.ts. */
  language?: Language;
  newVehicleSectionDescription: string;
  shareVehiclesSectionDescription: string;
  existingTokenId?: number;
  existingClientId?: string;
  /** The SDK's redirect-mode nonce, returned with every redirect back. */
  dimoState?: string;
}

export interface FetchedParams {
  devLicenseAlias: string;
  invalidCredentials: boolean;
  /** The popup's opener, or the embedding page, isn't the app's redirect URI origin. */
  untrustedCaller?: boolean;
  /** The URL has an OAuth `state` this tab didn't send (see readTrustedOAuthReturn). */
  untrustedOAuthReturn?: boolean;
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
  cloudEvent?: CloudEventAgreement | CloudEventAgreement[];
}

export interface AccountManagerParams {
  permissionTemplateId?: string;
  permissions?: string;
  expirationDate: BigInt;
  cloudEvent?: CloudEventAgreement | CloudEventAgreement[];
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

export type AccountManagerMandatoryParams = BaseParams &
  FetchedParams &
  AccountManagerParams;

export type AdvancedTransactionMandatoryParams = BaseParams &
  FetchedParams &
  AdvancedTransactionParams;

export type SignMessageMandatoryParams = BaseParams & FetchedParams & SignMessageParams;
