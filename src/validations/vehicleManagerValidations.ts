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

// The SDK's Permission enum is numeric, so PERMISSIONS also has its reverse
// (number) keys; one digit per named permission.
const PERMISSION_COUNT = Object.keys(PERMISSIONS).filter((key) =>
  isNaN(Number(key)),
).length;

const validatePermissionString = (value: string): boolean =>
  new RegExp(`^[01]{1,${PERMISSION_COUNT}}$`).test(value);

const validatePermissionParams: ValidationFunction = ({ permissions }) => {
  if (permissions && !validatePermissionString(permissions)) {
    return {
      isValid: false,
      error: {
        title: message('error.invalid_permissions_format.title'),
        message: message('error.invalid_permissions_format.message', {
          max: PERMISSION_COUNT,
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
