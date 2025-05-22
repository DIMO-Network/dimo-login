import { Header, Loader } from '../Shared';
import { useAuthContext } from '../../context/AuthContext';
import { FC, useEffect } from 'react';
import { passkeyStamper } from '../../services';
import { useUIManager } from '../../context/UIManagerContext';
import debounce from 'lodash/debounce';

interface Props {
  handlePasskeyRejected: (shouldFallback: boolean) => void;
}
export const PasskeyLogin: FC<Props> = ({ handlePasskeyRejected }) => {
  const { authenticateUser } = useAuthContext();
  const { setError } = useUIManager();
  const handleLoginWithPasskey = async () => {
    try {
      await authenticateUser(passkeyStamper);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          handlePasskeyRejected(true);
          return;
        }
      }
      handlePasskeyRejected(false);
      setError('Failed to login with passkey');
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
