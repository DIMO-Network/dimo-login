import { ValidationFunction } from '../hooks/useErrorHandler';
import { PERMISSIONS } from '../types';

const validatePermissionTemplate: ValidationFunction = ({
  permissionTemplateId,
  permissions,
}) => {
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

const validatePermissionString = (value: string): boolean =>
  new RegExp(`^[01]{1,${Object.keys(PERMISSIONS).length}}$`).test(value);

const validatePermissionParams: ValidationFunction = ({ permissions }) => {
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
