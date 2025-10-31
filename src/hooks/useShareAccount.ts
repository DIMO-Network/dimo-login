import {
  createPermissionsFromParams,
  generateIpfsSources,
  setAccountPermissions,
} from '../services';
import { SetAccountPermissions } from '@dimo-network/transactions';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { AccountManagerMandatoryParams } from '../types';
import { useAuthContext } from '../context/AuthContext';
import { INVALID_SESSION_ERROR } from '../utils/authUtils';
import { generateAttachments } from '../services/permissionsService';
import { getPermissionConfigForType } from '../utils/permissionConfigResolver';

export const useShareAccount = () => {
  const devCredentials = useDevCredentials<AccountManagerMandatoryParams>();
  const { clientId, expirationDate, region } = devCredentials;
  const { validateSession } = useAuthContext();

  // Get account-specific permissions config
  const accountConfig = getPermissionConfigForType(devCredentials, 'account');

  const validate = async () => {
    if (!clientId) {
      throw new Error('clientId is missing');
    }

    const permissionExists =
      accountConfig.permissionTemplateId || accountConfig.permissions;
    if (!permissionExists) {
      throw new Error('No permissions provided for account');
    }

    return !!(await validateSession());
  };

  return async () => {
    const isValid = await validate();
    if (!isValid) throw new Error(INVALID_SESSION_ERROR);

    const perms = createPermissionsFromParams(
      accountConfig.permissions,
      accountConfig.permissionTemplateId,
    );
    const attachments = generateAttachments(region?.toUpperCase());
    const source = await generateIpfsSources(perms, clientId, expirationDate, attachments);

    const accountPermissions: SetAccountPermissions = {
      grantee: clientId as `0x${string}`,
      permissions: perms,
      expiration: expirationDate,
      source,
      templateId: accountConfig.permissionTemplateId
        ? BigInt(accountConfig.permissionTemplateId)
        : undefined,
    };

    await setAccountPermissions(accountPermissions);
  };
};
