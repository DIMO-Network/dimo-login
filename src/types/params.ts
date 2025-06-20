import { UiStates } from '../enums';

export interface BaseParams {
  clientId: string;
  redirectUri: string;
  apiKey: string;
  utm: string;
  entryState?: UiStates;
  altTitle?: boolean;
  forceEmail?: boolean;
  configCID?: string;
  newVehicleSectionDescription?: string;
  shareVehiclesSectionDescription?: string;
}

export interface VehicleManagerParams {
  permissionTemplateId?: string;
  vehicles?: string | string[];
  vehicleMakes?: string | string[];
  expirationDate?: BigInt;
  powertrainTypes?: string | string[];
  region?: string;
  onboarding?: string;
}

export interface AdvancedTransactionParams {
  transactionData?: string;
}
export type AllParams = BaseParams &
  Partial<VehicleManagerParams & AdvancedTransactionParams>;
