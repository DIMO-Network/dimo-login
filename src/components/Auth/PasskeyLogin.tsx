import { Header, Loader } from '../Shared';
import { useAuthContext } from '../../context/AuthContext';
import { FC, useEffect } from 'react';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import debounce from 'lodash/debounce';

export const PasskeyLogin: FC = () => {
  const { completePasskeyLogin } = useAuthContext();
  const { setError, setUiState } = useUIManager();

  const handleLoginWithPasskey = async () => {
    try {
      await completePasskeyLogin();
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setUiState(UiStates.PASSKEY_LOGIN_FAIL);
          return;
        }
      }
      setError('Failed to login with passkey');
      setUiState(UiStates.EMAIL_INPUT);
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
