import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { listAppsSignedInAs, signOutAppHere } from '../services/accountStore';
import {
  fetchConnectedAppGrants,
  fetchLicenseAliases,
  type ConnectedAppGrants,
  type SacdGrant,
} from '../services/grantsService';

/** A vehicle shared with the app, and the grant that shares it. */
export type GrantedVehicle = {
  tokenId: number;
  tokenDID: string;
  name: string;
  grant: SacdGrant;
};

/** What one app (a grantee) can access now. */
export type AppAccess = {
  /** Lowercased. */
  grantee: `0x${string}`;
  vehicles: GrantedVehicle[];
  /** The grant on the account itself (its documents), if any. */
  documents: SacdGrant | null;
  /** When the last of its grants ends (ISO). */
  expiresAt: string;
};

const inForce = (grant: SacdGrant, now: number) => Date.parse(grant.expiresAt) > now;

const later = (a: string, b: string) => (Date.parse(a) >= Date.parse(b) ? a : b);

/**
 * The grants still in force, by app, in the order the apps first appear. An
 * ended grant (or one whose end can't be read) is left out, and an app with
 * nothing left with it.
 */
export const groupGrantsByApp = (
  { vehicles, accountGrants }: ConnectedAppGrants,
  now: number = Date.now(),
): AppAccess[] => {
  const apps = new Map<string, AppAccess>();
  const appFor = (grant: SacdGrant) => {
    const grantee = grant.grantee.toLowerCase() as `0x${string}`;
    let app = apps.get(grantee);
    if (!app) {
      app = { grantee, vehicles: [], documents: null, expiresAt: grant.expiresAt };
      apps.set(grantee, app);
    }
    app.expiresAt = later(app.expiresAt, grant.expiresAt);
    return app;
  };
  for (const vehicle of vehicles) {
    for (const grant of vehicle.grants.filter((g) => inForce(g, now))) {
      appFor(grant).vehicles.push({
        tokenId: vehicle.tokenId,
        tokenDID: vehicle.tokenDID,
        name: vehicle.name,
        grant,
      });
    }
  }
  for (const grant of accountGrants.filter((g) => inForce(g, now))) {
    appFor(grant).documents = grant;
  }
  return [...apps.values()];
};

/**
 * The connected-apps page's data: the apps that can access the account's
 * data (on-chain grants, public), and the other apps signed in as it on this
 * browser, with the license names of both. Nothing here is sent anywhere.
 */
export const useConnectedApps = () => {
  const { user } = useAuthContext();
  const { clientId } = useDevCredentials();
  const owner = user.smartContractAddress;
  const email = user.email;
  const [grants, setGrants] = useState<'loading' | 'error' | AppAccess[]>('loading');
  const [names, setNames] = useState<Map<string, string | null>>(new Map());
  // The app that opened this page is the one the person is using: not listed.
  const otherApps = useCallback(
    () =>
      listAppsSignedInAs(email).filter(
        (app) => app.toLowerCase() !== clientId?.toLowerCase(),
      ),
    [email, clientId],
  );
  const [browserApps, setBrowserApps] = useState<`0x${string}`[]>(otherApps);
  // Only the latest load writes, so a slow earlier one can't replace it.
  const loadRef = useRef(0);

  const reload = useCallback(async () => {
    const load = ++loadRef.current;
    const apps = otherApps();
    setBrowserApps(apps);
    setGrants('loading');
    let access: AppAccess[];
    try {
      if (!owner) throw new Error('The account has no wallet address yet');
      access = groupGrantsByApp(await fetchConnectedAppGrants(owner));
    } catch {
      if (load === loadRef.current) setGrants('error');
      return;
    }
    const aliases = await fetchLicenseAliases([...access.map((a) => a.grantee), ...apps]);
    if (load !== loadRef.current) return;
    setNames(aliases);
    setGrants(access);
  }, [owner, otherApps]);

  useEffect(() => {
    reload();
  }, [reload]);

  const signOutHere = (app: `0x${string}`) => {
    signOutAppHere(app);
    setBrowserApps(otherApps());
  };

  /** The app's license alias, or null when it has none (or it isn't known yet). */
  const nameOf = (address: string) => names.get(address.toLowerCase()) ?? null;

  return { grants, browserApps, nameOf, reload, signOutHere };
};
