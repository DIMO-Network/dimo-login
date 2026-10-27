import { useState } from 'react';

import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { getEmailChoice, setEmailGranted } from '../services/storageService';
import { resolveEmailRequest } from '../utils/emailRequest';

/**
 * The email as part of the app's request: whether it's asked for at all, and
 * the signed-in user's answer. The switch starts from the answer they gave
 * this app before. Nothing is stored until `commit`, which a screen calls when
 * the user approves or continues, so Cancel leaves the old answer as it was.
 * buildAuthPayload reads the stored answer when the app is told.
 */
export const useEmailRequest = () => {
  const { user } = useAuthContext();
  const { clientId, emailRequest, forceEmail } = useDevCredentials();
  const request = resolveEmailRequest(emailRequest, forceEmail);
  const email: string | undefined = user?.email || undefined;
  const [choice, setChoice] = useState(() => getEmailChoice(clientId, email) === true);
  const required = request === 'required';

  return {
    request,
    email,
    required,
    /** The request shows an email item. */
    asked: request !== 'none' && !!email,
    shared: required || choice,
    setShared: setChoice,
    commit: () => {
      if (request === 'none' || !email) return;
      setEmailGranted(clientId, email, required || choice);
    },
  };
};

export type EmailRequestState = ReturnType<typeof useEmailRequest>;
