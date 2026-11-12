import React, { type FC, useEffect, useRef, useState } from 'react';
import { captureException } from '@sentry/react';
import { KeyIcon } from '@heroicons/react/24/outline';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { useT } from '../../i18n';
import { addAuthenticator } from '../../services/accountsService';
import {
  getWalletSession,
  rememberAccount,
  snoozePasskeyOffer,
} from '../../services/accountStore';
import type { PreparedEnrollment } from '../../services/passkeyEnrollment';
import {
  getUserFromLocalStorage,
  storeUserInLocalStorage,
} from '../../services/storageService';
import { loadSignInSteps, type SignInSteps } from '../../services/walletLoader';
import { ActionBar, Button, DoneHeader, Notice, Screen } from '../ui';

type Status = 'preparing' | 'ready' | 'adding' | 'added' | 'exists' | 'error';

/** Reported when getting ready fails: fixed text, as the session key can be quoted in the error. */
const preparationError = () => new Error('Passkey offer could not get ready');

/**
 * Right after an email-code sign-in: add a passkey on this device, or not.
 * Whatever happens here, the sign-in goes on to where it was going
 * (continueAfterSignIn) once the person moves on; nothing here can stop it.
 */
export const PasskeyOffer: FC = () => {
  const t = useT();
  const { user, setUser, continueAfterSignIn } = useAuthContext();
  const { clientId } = useDevCredentials();
  const { setBusy } = useUIManager();
  const [status, setStatus] = useState<Status>('preparing');
  const ready = useRef<{ steps: SignInSteps; enrollment: PreparedEnrollment } | null>(
    null,
  );
  const { email, subOrganizationId } = user;

  // Got ready before the click, which then opens the passkey prompt at once.
  useEffect(() => {
    let current = true;
    loadSignInSteps()
      .then(async (steps) => {
        // The account's own email-code session, and the passkeys it has.
        const enrollment = await steps.prepareEnrollment(
          getWalletSession(subOrganizationId),
          subOrganizationId,
          user.credentialIds ?? [],
        );
        if (!current) return;
        ready.current = { steps, enrollment };
        setStatus('ready');
      })
      .catch(() => {
        if (!current) return;
        captureException(preparationError());
        setStatus('error');
      });
    return () => {
      current = false;
    };
    // Once, for the account that just signed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordAdded = () => {
    setUser((current) => ({ ...current, hasPasskey: true }));
    try {
      const stored = getUserFromLocalStorage(clientId);
      if (stored) storeUserInLocalStorage(clientId, { ...stored, hasPasskey: true });
      rememberAccount({ ...user, hasPasskey: true });
    } catch {
      // Storage blocked: the next sign-in reads the account again.
    }
  };

  const add = () => {
    const prepared = ready.current;
    if (!prepared || status !== 'ready') return;
    setStatus('adding');
    setBusy(true);
    // Called inside the click, before anything is awaited (see prepareEnrollment).
    prepared.steps
      .enrollPasskey(prepared.enrollment, email)
      .then((signed) => addAuthenticator(email, signed))
      .then(
        () => {
          recordAdded();
          snoozePasskeyOffer(subOrganizationId);
          setStatus('added');
        },
        (error: unknown) => {
          const name = error instanceof DOMException ? error.name : '';
          if (name === 'NotAllowedError') {
            // The prompt was closed or timed out: the choice is still open.
            setStatus('ready');
          } else if (name === 'InvalidStateError') {
            snoozePasskeyOffer(subOrganizationId);
            setStatus('exists');
          } else {
            captureException(error);
            setStatus('error');
          }
        },
      )
      .finally(() => setBusy(false));
  };

  const notNow = () => {
    snoozePasskeyOffer(subOrganizationId);
    continueAfterSignIn();
  };

  const answered = status === 'added' || status === 'exists' || status === 'error';
  const actions = (
    <ActionBar className="[&>div]:flex-col">
      {answered ? (
        <Button fullWidth onClick={continueAfterSignIn}>
          {t('common.continue')}
        </Button>
      ) : (
        <>
          <Button
            fullWidth
            onClick={add}
            disabled={status === 'preparing'}
            loading={status === 'adding'}
            loadingLabel={t('passkey_offer.adding')}
          >
            {t('passkey_offer.add')}
          </Button>
          {status !== 'adding' && (
            <Button variant="ghost" fullWidth onClick={notNow}>
              {t('passkey_offer.not_now')}
            </Button>
          )}
        </>
      )}
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <DoneHeader
        tone="ink"
        icon={<KeyIcon className="size-[26px]" />}
        title={t('passkey_offer.title')}
      >
        <span className="wrap-anywhere">{t('passkey_offer.body', { email })}</span>
      </DoneHeader>
      {status === 'added' && (
        <Notice tone="positive" role="status">
          {t('passkey_offer.added')}
        </Notice>
      )}
      {status === 'exists' && (
        <Notice role="status">
          <span className="wrap-anywhere">{t('passkey_offer.exists', { email })}</span>
        </Notice>
      )}
      {status === 'error' && (
        <Notice tone="warning" role="status">
          {t('passkey_offer.error')}
        </Notice>
      )}
    </Screen>
  );
};
