import { ValidationFunction } from '../hooks/useErrorHandler';
import { PERMISSIONS } from '../types';
import { message } from '../i18n';

const validatePermissionTemplate: ValidationFunction = ({
  permissionTemplateId,
  permissions,
}) => {
  if (!permissionTemplateId && !permissions) {
    return {
      isValid: false,
      error: {
        title: message('error.missing_permissions.title'),
        message: message('error.missing_permissions.message'),
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
        title: message('error.invalid_permissions_format.title'),
        message: message('error.invalid_permissions_format.message', {
          max: Object.keys(PERMISSIONS).length,
        }),
      },
    };
  }

  return { isValid: true };
};

export const vehicleManagerValidations = {
  validatePermissionTemplate,
  validatePermissionParams,
};
