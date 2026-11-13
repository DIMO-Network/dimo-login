/**
 * Whether to offer a passkey after an email-code sign-in (PASSKEY_OFFER).
 * First-screen safe: no wallet code here; adding the passkey is in
 * passkeyEnrollment, part of the wallet chunk.
 */
import type { UserObject } from '../models/user';
import { passkeyOfferEnabled } from '../utils/featureFlags';
import { isEmbed } from '../utils/isEmbed';
import { isPasskeyOfferSnoozed } from './accountStore';

const hasPlatformAuthenticator = async (): Promise<boolean> => {
  try {
    const credential = window.PublicKeyCredential;
    return (await credential?.isUserVerifyingPlatformAuthenticatorAvailable?.()) === true;
  } catch {
    return false;
  }
};

// Where storage is blocked, "Not now" couldn't be kept: the offer would come
// back at every code sign-in.
const storageWritable = (): boolean => {
  const probe = 'dimo_storage_probe';
  try {
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

/**
 * Whether to offer this account a passkey, just after it signed in with an
 * email code. Only with REACT_APP_PASSKEY_OFFER on, never embedded, only on a
 * device that can keep a passkey, where this browser can keep "Not now", not
 * within 30 days of it, and only when the account's passkeys are known to be
 * recorded: an account with a passkey and no records (one made before passkeys
 * were recorded) is never offered, since recording a first one would hide its
 * original passkey from the apps that list them. Never throws.
 */
export const shouldOfferPasskey = async (account: UserObject): Promise<boolean> => {
  if (!passkeyOfferEnabled() || isEmbed()) return false;
  const { subOrganizationId, hasPasskey, credentialIds } = account;
  if (!subOrganizationId || !Array.isArray(credentialIds)) return false;
  if (hasPasskey && credentialIds.length === 0) return false;
  if (isPasskeyOfferSnoozed(subOrganizationId) || !storageWritable()) return false;
  return hasPlatformAuthenticator();
};
