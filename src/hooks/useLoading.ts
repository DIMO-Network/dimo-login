import { useEffect, useState } from 'react';

import { message as translated, type Text } from '../i18n';

const useLoading = (
  initialLoadingState: boolean,
): [
  boolean,
  (loading: boolean, message?: Text, isLongProcess?: boolean) => void,
  Text,
] => {
  const [isLoading, setIsLoading] = useState(initialLoadingState);
  const [isLongProcess, setIsLongProcess] = useState<boolean>(false);
  const [message, setMessage] = useState<Text>('');

  const handleSetLoading = (
    loading: boolean,
    message?: Text,
    isLongProcess?: boolean,
  ) => {
    setIsLoading(loading);
    setIsLongProcess(isLongProcess || false);
    setMessage(loading && message ? message : '');
  };

  useEffect(() => {
    if (!isLongProcess) return;

    let timeoutIdStillWorking: NodeJS.Timeout | null = null;
    let timeoutIdAlmostThere: NodeJS.Timeout | null = null;

    if (isLoading) {
      timeoutIdStillWorking = setTimeout(() => {
        setMessage(translated('loading.still_working'));
      }, 5000);

      timeoutIdAlmostThere = setTimeout(() => {
        setMessage(translated('loading.almost_there'));
      }, 8000);
    }

    return () => {
      if (timeoutIdStillWorking) clearTimeout(timeoutIdStillWorking);
      if (timeoutIdAlmostThere) clearTimeout(timeoutIdAlmostThere);
    };
  }, [isLoading, isLongProcess]);

  return [isLoading, handleSetLoading, message];
};

export default useLoading;
