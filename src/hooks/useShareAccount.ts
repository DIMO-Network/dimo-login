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

    // DEBUG-SACD: Log account sharing flow start
    console.log('🔵 DEBUG-SACD: useShareAccount - Starting account sharing');
    console.log('  - accountConfig:', accountConfig);
    console.log('  - devCredentials:', devCredentials);

    const perms = createPermissionsFromParams(
      accountConfig.permissions,
      accountConfig.permissionTemplateId,
    );

    // DEBUG-SACD: Log permissions created
    console.log('🔵 DEBUG-SACD: useShareAccount - Permissions created:', perms);

    const attachments = generateAttachments(region?.toUpperCase());

    // DEBUG-SACD: Check for attestation tags
    const attestationTags = devCredentials.attestationTags;
    console.log('🔵 DEBUG-SACD: useShareAccount - Attestation tags from config:', attestationTags);

    // Generate cloudEventAgreements from attestationTags
    // Use wildcards for source and ids, specific tags for filtering
    const cloudEventAgreements =
      attestationTags && attestationTags.length > 0
        ? attestationTags.map((tag) => ({
            eventType: 'dimo.attestation',
            source: '*' as `0x${string}`,  // Wildcard: all sources
            ids: ['*'],                     // Wildcard: all attestation IDs
            tags: [tag],                    // Specific tag (drivers_license, insurance, etc.)
          }))
        : undefined;

    console.log('🔵 DEBUG-SACD: useShareAccount - CloudEvent agreements generated:', cloudEventAgreements);

    const source = await generateIpfsSources(
      perms,
      clientId,
      expirationDate,
      attachments,
      cloudEventAgreements,
    );

    // DEBUG-SACD: Log account permissions about to be set
    const accountPermissions: SetAccountPermissions = {
      grantee: clientId as `0x${string}`,
      permissions: perms,
      expiration: expirationDate,
      source,
      templateId: accountConfig.permissionTemplateId
        ? BigInt(accountConfig.permissionTemplateId)
        : BigInt(0),
    };
    console.log('🔵 DEBUG-SACD: useShareAccount - Account permissions object:', accountPermissions);

    await setAccountPermissions(accountPermissions);
    console.log('🟢 DEBUG-SACD: useShareAccount - Account sharing completed');
  };
};
