let forceEmail = false;

export const setForceEmail = (value: boolean) => {
  forceEmail = value;
};

export const getForceEmail = () => forceEmail;

// The email-sharing choice made before a Google/Apple redirect. The grant is
// stored per account, and the account's email is only known once the OAuth
// code is exchanged, so it waits here until then.
let pendingEmailGrant: boolean | undefined;

export const setPendingEmailGrant = (value: boolean | undefined) => {
  pendingEmailGrant = value;
};

export const takePendingEmailGrant = (): boolean | undefined => {
  const value = pendingEmailGrant;
  pendingEmailGrant = undefined;
  return value;
};
