import { ValidationFunction } from '../hooks/useErrorHandler';
import { getParamFromUrlOrState } from '../utils/urlHelpers';

const validatePermissionTemplate: ValidationFunction = ({ urlParams, decodedState }) => {
  const permissionTemplateId = getParamFromUrlOrState(
    'permissionTemplateId',
    urlParams,
    decodedState,
  );

  if (!permissionTemplateId) {
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

export const vehicleManagerValidations = {
  validatePermissionTemplate,
} satisfies Record<string, ValidationFunction>;
