import { useState } from 'react';

import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { isEmailGranted, setEmailGranted } from '../services/storageService';
import { getForceEmail } from '../stores/AuthStateStore';

/**
 * The email-sharing choice for a signed-in user. A returning session skips the
 * sign-in screen, so a user who never chose for this app (or whose choice was
 * lost) is asked on the screen that sends them back: share vehicles, share
 * documents, or the plain login's done screen. The choice is stored per app
 * and account, and buildAuthPayload reads it when the app is told.
 */
export const useEmailShare = () => {
  const { user } = useAuthContext();
  const { clientId } = useDevCredentials();
  const email: string | undefined = user?.email || undefined;
  // Decided once per screen, so the row doesn't vanish when it's switched on.
  const [ask] = useState(() => !!email && !isEmailGranted(clientId, email));
  const [shared, setShared] = useState(false);

  const setShare = (next: boolean) => {
    setShared(next);
    setEmailGranted(clientId, email, next);
  };

  return {
    ask,
    email,
    shared,
    setShare,
    required: getForceEmail(),
    /** The app requires the email and it isn't shared yet. */
    blocked: ask && getForceEmail() && !shared,
  };
};

export type EmailShare = ReturnType<typeof useEmailShare>;
