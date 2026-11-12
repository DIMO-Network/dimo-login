/**
 * passkeyEnrollment.ts
 *
 * Adding a passkey after an email-code sign-in (PASSKEY_OFFER): the new
 * passkey's creation, stamped with the account's own email-code session, for
 * the accounts API to forward to Turnkey and record. Part of the wallet
 * chunk: reached through signInSteps (walletLoader), never imported by the
 * first screen. It imports nothing the first screen loads, so the bundle's
 * shared chunks stay as they are; the caller reads the session and sends the
 * request (passkeyOffer.ts decides whether to offer at all).
 */
import { TurnkeyClient } from '@turnkey/http';

import type { StampedRequest } from './accountsService';
import {
  createPasskey,
  getApiKeyStamper,
  getKernelSigner,
  type TurnkeySessionDataWithExpiry,
} from './turnkeyService';

// The name sign-up gives the account's passkeys on Turnkey.
const AUTHENTICATOR_NAME = 'DIMO PASSKEY';

export type PreparedEnrollment = {
  client: TurnkeyClient;
  /** The account's own Turnkey user, which the passkey is added to. */
  userId: string;
  subOrganizationId: string;
  /** The account's recorded passkeys, which this device must not make again. */
  excludeCredentialIds: string[];
};

/**
 * Everything adding a passkey needs before the person's click, so the click
 * can open the passkey prompt at once: Safari opens it only while the click
 * is being handled. `session` must be the account's own (stored under its
 * sub-organization) live email-code session.
 */
export const prepareEnrollment = async (
  session: TurnkeySessionDataWithExpiry | null,
  subOrganizationId: string,
  excludeCredentialIds: string[],
): Promise<PreparedEnrollment> => {
  if (session?.sessionType !== 'api_key' || !(session.expiresAt > Date.now())) {
    throw new Error('No live email-code session for this account');
  }
  const stamper = getApiKeyStamper({
    credentialBundle: session.credentialBundle,
    embeddedKey: session.embeddedKey,
  });
  const client = new TurnkeyClient(
    { baseUrl: getKernelSigner().config.turnkeyApiBaseUrl },
    stamper,
  );
  const whoami = await client.getWhoami({ organizationId: subOrganizationId });
  if (whoami.organizationId !== subOrganizationId) {
    throw new Error('The session belongs to another organization');
  }
  return { client, userId: whoami.userId, subOrganizationId, excludeCredentialIds };
};

/**
 * Makes the passkey (its prompt opens before anything is awaited) and stamps
 * its creation for the account's Turnkey user. Rejects with the passkey
 * prompt's DOMException (InvalidStateError: this device already has one of
 * the account's passkeys) or the stamp's error.
 */
export const enrollPasskey = async (
  { client, userId, subOrganizationId, excludeCredentialIds }: PreparedEnrollment,
  email: string,
): Promise<StampedRequest> => {
  const [attestation, challenge] = await createPasskey(email, { excludeCredentialIds });
  return client.stampCreateAuthenticators({
    type: 'ACTIVITY_TYPE_CREATE_AUTHENTICATORS_V2',
    timestampMs: String(Date.now()),
    organizationId: subOrganizationId,
    parameters: {
      userId,
      authenticators: [{ authenticatorName: AUTHENTICATOR_NAME, challenge, attestation }],
    },
  });
};
