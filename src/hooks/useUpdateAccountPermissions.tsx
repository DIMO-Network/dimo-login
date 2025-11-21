import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { INVALID_SESSION_ERROR } from '../utils/authUtils';
import {
  createPermissionsFromParams,
  generateIpfsSources,
  setAccountPermissions,
} from '../services';
import { SetAccountPermissions } from '@dimo-network/transactions';

type UpdateAccountPermissionsParams = {
  permissionTemplateId?: string;
  permissions?: string;
  expiration: bigint;
};

export const useUpdateAccountPermissions = () => {
  const { validateSession } = useAuthContext();
  const { clientId } = useDevCredentials();

  return async ({
    permissionTemplateId,
    permissions,
    expiration,
  }: UpdateAccountPermissionsParams) => {
    const hasValidSession = await validateSession();
    if (!hasValidSession) {
      throw new Error(INVALID_SESSION_ERROR);
    }

    const perms = createPermissionsFromParams(permissions, permissionTemplateId);
    const sources = await generateIpfsSources(perms, clientId, expiration);

    const accountPermissions: SetAccountPermissions = {
      grantee: clientId as `0x${string}`,
      permissions: perms,
      expiration,
      source: sources,
      templateId: permissionTemplateId ? BigInt(permissionTemplateId) : BigInt(0),
    };

    await setAccountPermissions(accountPermissions);
  };
};
