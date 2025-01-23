import { useEffect, useState } from "react";

const useLoading = (
  initialLoadingState: boolean
): [boolean, (loading: boolean, message?: string) => void, string] => {
  const [isLoading, setIsLoading] = useState(initialLoadingState);
  const [isLongProcess, setIsLongProcess] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const handleSetLoading = (
    loading: boolean,
    message?: string,
    isLongProcess?: boolean
  ) => {
    setIsLoading(loading);
    setIsLongProcess(isLongProcess || false);
    setMessage(loading && message ? message : "");
  };

  useEffect(() => {
    if (!isLongProcess) return;

    let timeoutIdStillWorking: NodeJS.Timeout | null = null;
    let timeoutIdAlmostThere: NodeJS.Timeout | null = null;

    if (isLoading) {
      timeoutIdStillWorking = setTimeout(() => {
        setMessage("Still working…");
      }, 5000);

      timeoutIdAlmostThere = setTimeout(() => {
        setMessage("Hang tight, almost there.");
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
