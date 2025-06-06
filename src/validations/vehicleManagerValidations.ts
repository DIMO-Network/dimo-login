import { ValidationFunction } from '../hooks/useErrorHandler';
import { getParamFromUrlOrState } from '../utils/urlHelpers';
import { PERMISSIONS } from '../types/permissions';

interface ValidationResult {
  isValid: boolean;
  error?: {
    title: string;
    message: string;
  };
}

interface ValidationParams {
  urlParams: URLSearchParams;
  decodedState: Record<string, unknown>;
}

const validatePermissionString = (value: string): boolean =>
  new RegExp(`^[01]{1,${Object.keys(PERMISSIONS).length}}$`).test(value);

const validatePermissionTemplate: ValidationFunction = ({
  urlParams,
  decodedState,
}: ValidationParams): ValidationResult => {
  const permissionTemplateId = getParamFromUrlOrState(
    'permissionTemplateId',
    urlParams,
    decodedState,
  );

  const permissions = getParamFromUrlOrState('permissions', urlParams, decodedState) as
    | string
    | undefined;

  if (!permissionTemplateId && !permissions) {
    return {
      isValid: false,
      error: {
        title: 'Missing Permissions',
        message: 'Missing permissions, please specify permissions requested.',
      },
    };
  }
  return { isValid: true };
};

const validatePermissionParams = ({
  urlParams,
  decodedState,
}: ValidationParams): ValidationResult => {
  const permissions = getParamFromUrlOrState('permissions', urlParams, decodedState) as
    | string
    | undefined;

  if (permissions && !validatePermissionString(permissions)) {
    return {
      isValid: false,
      error: {
        title: 'Invalid Permissions Format',
        message: `Permissions must be a string of 0s and 1s with a maximum length of ${Object.keys(PERMISSIONS).length}.`,
      },
    };
  }

  return { isValid: true };
};

export const vehicleManagerValidations = {
  validatePermissionTemplate,
  validatePermissionParams,
};
