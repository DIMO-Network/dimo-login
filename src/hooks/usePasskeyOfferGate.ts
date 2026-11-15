import { useRef } from 'react';

import { UiStates } from '../enums';
import type { UserObject } from '../models/user';
// Only for PasskeyOffer.preload(): the offer is shown only once its screen has
// loaded, so a missing chunk can't strand a sign-in (see decide).
import { PasskeyOffer } from '../screens';
import { shouldOfferPasskey } from '../services/passkeyOffer';
import { withTimeout } from '../utils/withTimeout';

/** How long a code sign-in waits to decide on the passkey offer. */
const OFFER_DECISION_MS = 1_500;

/**
 * The passkey offer between an email-code sign-in and where that sign-in was
 * going: whether to show it, holding the rest of the sign-in while it shows,
 * and going on from it, once.
 */
export const usePasskeyOfferGate = (setUiState: (state: UiStates) => void) => {
  // Where the sign-in goes once the offer is answered.
  const waiting = useRef<(() => void) | null>(null);

  /**
   * Whether to show the offer. The person is already signed in by then, so
   * the whole decision gets OFFER_DECISION_MS; past that, or on any failure,
   * the sign-in goes on without it.
   */
  const decide = async (account: UserObject): Promise<boolean> => {
    const offer = async () => {
      if (!(await shouldOfferPasskey(account))) return false;
      await PasskeyOffer.preload();
      return true;
    };
    try {
      return await withTimeout(offer(), OFFER_DECISION_MS, 'passkey offer');
    } catch {
      return false;
    }
  };

  /** Shows the offer; `proceed` runs when the person moves on from it. */
  const hold = (proceed: () => void) => {
    waiting.current = proceed;
    setUiState(UiStates.PASSKEY_OFFER);
  };

  /** Goes on to where the sign-in was going. Runs that once; later calls do nothing. */
  const continueAfterSignIn = () => {
    const proceed = waiting.current;
    waiting.current = null;
    proceed?.();
  };

  /** Forgets a sign-in still waiting on the offer (a new sign-in, another account). */
  const drop = () => {
    waiting.current = null;
  };

  return { decide, hold, continueAfterSignIn, drop };
};
