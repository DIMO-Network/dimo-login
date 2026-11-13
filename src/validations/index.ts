import { ValidationFunction } from '../hooks/useErrorHandler';
import { vehicleManagerValidations } from './vehicleManagerValidations';
import { advancedTransactionValidations } from './advancedTransactionValidations';
import { signMessageValidations } from './signMessageValidations';
import { connectedAppsValidations } from './connectedAppsValidations';

type ValidationMap = Record<string, Record<string, ValidationFunction>>;

const VALIDATIONS: ValidationMap = {
  VEHICLE_MANAGER: vehicleManagerValidations,
  ADVANCED_TRANSACTION: advancedTransactionValidations,
  SIGN_MESSAGE: signMessageValidations,
  CONNECTED_APPS: connectedAppsValidations,
} as const satisfies ValidationMap;

export const getValidationsForState = (state: string) => {
  return VALIDATIONS[state as keyof typeof VALIDATIONS] || {};
};
