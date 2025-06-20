import { ValidationFunction } from '../hooks/useErrorHandler';

const validatePermissionTemplate: ValidationFunction = ({ permissionTemplateId }) => {
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
