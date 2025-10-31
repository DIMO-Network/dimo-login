import { ValidationFunction } from '../hooks/useErrorHandler';
import { PERMISSIONS } from '../types';

const validatePermissionTemplate: ValidationFunction = ({
  permissionTemplateId,
  permissions,
  accountPermissionTemplateId,
  accountPermissions,
}) => {
  // Check for account-specific permissions first, then fall back to generic
  const hasAccountPerms = accountPermissionTemplateId || accountPermissions;
  const hasGenericPerms = permissionTemplateId || permissions;

  if (!hasAccountPerms && !hasGenericPerms) {
    return {
      isValid: false,
      error: {
        title: 'Missing Permissions',
        message: 'Missing permissions for account, please specify permissions requested.',
      },
    };
  }
  return { isValid: true };
};

const validatePermissionString = (value: string): boolean =>
  new RegExp(`^[01]{1,${Object.keys(PERMISSIONS).length}}$`).test(value);

const validatePermissionParams: ValidationFunction = ({ permissions, accountPermissions }) => {
  const permsToValidate = accountPermissions || permissions;

  if (permsToValidate && !validatePermissionString(permsToValidate)) {
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

export const accountManagerValidations = {
  validatePermissionTemplate,
  validatePermissionParams,
};
