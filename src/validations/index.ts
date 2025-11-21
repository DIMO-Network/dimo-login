import { ValidationFunction } from '../hooks/useErrorHandler';
import { vehicleManagerValidations } from './vehicleManagerValidations';
import { accountManagerValidations } from './accountManagerValidations';
import { advancedTransactionValidations } from './advancedTransactionValidations';

type ValidationMap = Record<string, Record<string, ValidationFunction>>;

const VALIDATIONS: ValidationMap = {
  VEHICLE_MANAGER: vehicleManagerValidations,
  ACCOUNT_MANAGER: accountManagerValidations,
  ADVANCED_TRANSACTION: advancedTransactionValidations,
} as const satisfies ValidationMap;

export const getValidationsForState = (state: string) => {
  return VALIDATIONS[state as keyof typeof VALIDATIONS] || {};
};
