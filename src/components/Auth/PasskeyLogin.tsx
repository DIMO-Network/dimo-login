import { Header, Loader } from '../Shared';
import { useAuthContext } from '../../context/AuthContext';
import { FC, useEffect } from 'react';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import debounce from 'lodash/debounce';

// The passkey chain (WebAuthn prompt → Turnkey → KernelSigner → bundler/RPC →
// challenge → JWT) has no internal timeout, and this component renders only a
// spinner. If the passkey sheet is dismissed without a clean reject, or the
// bundler/RPC stalls, the loader would otherwise spin forever. Cap it.
const PASSKEY_TIMEOUT_MS = 60_000;

export const PasskeyLogin: FC = () => {
  const { completePasskeyLogin } = useAuthContext();
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
      // Treat user-cancel and timeout/abort alike: route to the retry screen
      // rather than dropping the user on a dead spinner or the email screen.
      if (
        err instanceof Error &&
        ['NotAllowedError', 'AbortError', 'TimeoutError'].includes(err.name)
      ) {
        setUiState(UiStates.PASSKEY_LOGIN_FAIL);
        return;
      }
      setError('Failed to login with passkey');
      setUiState(UiStates.EMAIL_INPUT);
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
    <>
      <Header title={'Continue with passkey'} />
      <div className={'mt-8'}>
        <Loader />
      </div>
    </>
  );
};
