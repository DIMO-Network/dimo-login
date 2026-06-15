import { Permission } from '@dimo-network/transactions';
import { generateAccountIpfsSource, setAccountPermissions } from '../services';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { useAuthContext } from '../context/AuthContext';
import { INVALID_SESSION_ERROR } from '../utils/authUtils';
import { AccountManagerMandatoryParams } from '../types';

// Account-sharing analogue of useShareVehicles: signs an account-level SACD
// granting the clientId GetRawData on the user's personal-document cloudevents.
export const useShareAccounts = () => {
  const { clientId, expirationDate } =
    useDevCredentials<AccountManagerMandatoryParams>();
  const { validateSession } = useAuthContext();

  return async () => {
    if (!clientId) throw new Error('clientId is missing');
    const valid = !!(await validateSession());
    if (!valid) throw new Error(INVALID_SESSION_ERROR);

    const permissions = [Permission.GetRawData];
    const source = await generateAccountIpfsSource(
      permissions,
      clientId,
      expirationDate,
    );
    await setAccountPermissions({
      grantee: clientId as `0x${string}`,
      permissions,
      expiration: expirationDate,
      // BigInt(0); the project targets es5 so 0n literals aren't available.
      templateId: BigInt(0),
      source,
    });
  };
};
