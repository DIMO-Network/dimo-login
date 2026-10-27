import React, { FC, useEffect } from 'react';
import debounce from 'lodash/debounce';
import { FingerPrintIcon } from '@heroicons/react/24/outline';

import { useAuthContext } from '../../context/AuthContext';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { message, useT } from '../../i18n';
import { ActionBar, Button, DoneHeader, Screen } from '../ui';

// The passkey chain (WebAuthn prompt → Turnkey → KernelSigner → bundler/RPC →
// challenge → JWT) has no internal timeout, and this component renders only a
// spinner. If the passkey sheet is dismissed without a clean reject, or the
// bundler/RPC stalls, the loader would otherwise spin forever. Cap it.
const PASSKEY_TIMEOUT_MS = 60_000;

/** The passkey prompt opens by itself; this screen says what it's for. */
export const PasskeyLogin: FC<{ email?: string }> = ({ email }) => {
  const t = useT();
  const { completePasskeyLogin, user } = useAuthContext();
  const { setError, setUiState } = useUIManager();

  const handleLoginWithPasskey = async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        completePasskeyLogin(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new DOMException('Passkey login timed out', 'TimeoutError')),
            PASSKEY_TIMEOUT_MS,
          );
        }),
      ]);
    } catch (err) {
      // Every failure lands on the retry screen, which offers the passkey
      // again, an email code, or another account. A cancel or timeout needs
      // no explanation there; anything else says it failed.
      const cancelled =
        err instanceof Error &&
        ['NotAllowedError', 'AbortError', 'TimeoutError'].includes(err.name);
      setError(cancelled ? null : message('passkey.error'));
      setUiState(UiStates.PASSKEY_LOGIN_FAIL);
    } finally {
      clearTimeout(timer);
    }
  };

  useEffect(() => {
    // We need to debounce this call because for some reason this component gets un-mounted
    // Which then leads to a double passkey prompt.
    // The debounced function will be canceled when the component gets un-mounted the first time.
    const callback = debounce(() => {
      void handleLoginWithPasskey();
    }, 1000);
    callback();
    return () => {
      callback.cancel();
    };
    // eslint-disable-next-line
  }, []);

  return (
    <Screen
      actions={
        <ActionBar>
          <Button loading loadingLabel={t('passkey.waiting')} fullWidth>
            {t('passkey.cta')}
          </Button>
        </ActionBar>
      }
    >
      <DoneHeader
        tone="ink"
        icon={<FingerPrintIcon className="size-[26px]" />}
        title={t('passkey.title')}
      >
        {t('passkey.body', { email: email || user?.email || '' })}
      </DoneHeader>
    </Screen>
  );
};
