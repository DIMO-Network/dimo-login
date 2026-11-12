/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const CLIENT = '0x2222222222222222222222222222222222222222';
const USER = {
  email: 'jun@example.com',
  subOrganizationId: 'sub-jun',
  hasPasskey: false,
  walletAddress: '0xw' as const,
  smartContractAddress: '0xs' as const,
  emailVerified: true,
  credentialIds: ['cred-recorded'],
};
const mockAuth = {
  user: USER,
  setUser: vi.fn(),
  continueAfterSignIn: vi.fn(),
};
vi.mock('../../../context/AuthContext', () => ({ useAuthContext: () => mockAuth }));
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({ clientId: CLIENT }),
}));
const mockUi = { setBusy: vi.fn() };
vi.mock('../../../context/UIManagerContext', () => ({ useUIManager: () => mockUi }));
const steps = { prepareEnrollment: vi.fn(), enrollPasskey: vi.fn() };
vi.mock('../../../services/walletLoader', () => ({
  loadSignInSteps: () => Promise.resolve(steps),
}));
vi.mock('../../../services/accountsService', () => ({ addAuthenticator: vi.fn() }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import { captureException } from '@sentry/react';
import { addAuthenticator } from '../../../services/accountsService';
import {
  getRememberedAccounts,
  isPasskeyOfferSnoozed,
  setWalletSession,
} from '../../../services/accountStore';
import { PasskeyOffer } from '../PasskeyOffer';

const PREPARED = { userId: 'user-1' };
const SIGNED = {
  url: 'u',
  body: 'b',
  stamp: { stampHeaderName: 'X-Stamp', stampHeaderValue: 's' },
};
const SESSION = {
  sessionType: 'api_key',
  embeddedKey: 'key',
  credentialBundle: 'bundle',
  expiresAt: Date.now() + 600_000,
} as const;
const addButton = () => screen.getByRole('button', { name: 'Add a passkey' });

const ready = async () => {
  render(<PasskeyOffer />);
  await waitFor(() => expect(addButton()).not.toHaveAttribute('aria-disabled'));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    `user_data_${CLIENT}`,
    JSON.stringify({ ...USER, credentialIds: undefined }),
  );
  setWalletSession('sub-jun', SESSION);
  steps.prepareEnrollment.mockResolvedValue(PREPARED);
  steps.enrollPasskey.mockResolvedValue(SIGNED);
  vi.mocked(addAuthenticator).mockResolvedValue(undefined);
});

it('offers a passkey for the account, once it is ready to make one', async () => {
  const prepared = Promise.withResolvers<typeof PREPARED>();
  steps.prepareEnrollment.mockReturnValue(prepared.promise);
  render(<PasskeyOffer />);
  expect(
    screen.getByRole('heading', { name: 'Sign in faster next time' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      'Add a passkey for jun@example.com on this device. Next time, sign in with your fingerprint, face or device PIN instead of a code.',
    ),
  ).toBeInTheDocument();
  expect(addButton()).toHaveAttribute('aria-disabled', 'true');
  // With the account's own session and the passkeys it has.
  await waitFor(() =>
    expect(steps.prepareEnrollment).toHaveBeenCalledWith(SESSION, 'sub-jun', [
      'cred-recorded',
    ]),
  );

  await act(async () => prepared.resolve(PREPARED));
  expect(addButton()).not.toHaveAttribute('aria-disabled');
});

it('adds the passkey, records that the account has one, then goes on', async () => {
  await ready();
  fireEvent.click(addButton());
  expect(steps.enrollPasskey).toHaveBeenCalledWith(PREPARED, 'jun@example.com');
  expect(await screen.findByText('Passkey added.')).toBeInTheDocument();
  expect(addAuthenticator).toHaveBeenCalledWith('jun@example.com', SIGNED);

  const update = mockAuth.setUser.mock.calls[0][0];
  expect(update(USER)).toEqual({ ...USER, hasPasskey: true });
  expect(JSON.parse(localStorage.getItem(`user_data_${CLIENT}`)!)).toMatchObject({
    hasPasskey: true,
  });
  expect(getRememberedAccounts(null)).toEqual([
    expect.objectContaining({ email: 'jun@example.com', hasPasskey: true }),
  ]);
  // The recorded credential IDs stay in memory.
  expect(JSON.stringify({ ...localStorage })).not.toContain('cred-recorded');
  expect(mockUi.setBusy).toHaveBeenCalledWith(true);
  expect(mockUi.setBusy).toHaveBeenLastCalledWith(false);
  expect(mockAuth.continueAfterSignIn).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(mockAuth.continueAfterSignIn).toHaveBeenCalledTimes(1);
});

it('shows that it is adding the passkey meanwhile, and can be skipped', async () => {
  const enrolling = Promise.withResolvers<typeof SIGNED>();
  steps.enrollPasskey.mockReturnValue(enrolling.promise);
  await ready();
  fireEvent.click(addButton());
  expect(await screen.findByText('Adding your passkey…')).toBeInTheDocument();
  expect(mockUi.setBusy).toHaveBeenLastCalledWith(true);

  // Whatever the add is waiting on, the sign-in can go on.
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  expect(mockAuth.continueAfterSignIn).toHaveBeenCalledTimes(1);
  expect(mockUi.setBusy).toHaveBeenLastCalledWith(false);
  expect(isPasskeyOfferSnoozed('sub-jun')).toBe(true);

  // When the add settles later, the next screen's busy state isn't touched.
  mockUi.setBusy.mockClear();
  await act(async () => enrolling.resolve(SIGNED));
  expect(mockUi.setBusy).not.toHaveBeenCalled();
  expect(mockAuth.continueAfterSignIn).toHaveBeenCalledTimes(1);
});

it('says it couldn’t add one when the accounts API doesn’t answer in time', async () => {
  vi.mocked(addAuthenticator).mockRejectedValue(
    new DOMException('aborted', 'AbortError'),
  );
  await ready();
  fireEvent.click(addButton());
  expect(
    await screen.findByText('Couldn’t add a passkey. You can keep using email codes.'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(mockAuth.continueAfterSignIn).toHaveBeenCalledTimes(1);
});

it('Not now snoozes the offer for the account and goes on', async () => {
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  expect(isPasskeyOfferSnoozed('sub-jun')).toBe(true);
  expect(mockAuth.continueAfterSignIn).toHaveBeenCalledTimes(1);
  expect(steps.enrollPasskey).not.toHaveBeenCalled();
});

it('says when the device already has a passkey for the account', async () => {
  steps.enrollPasskey.mockRejectedValue(
    new DOMException('excluded', 'InvalidStateError'),
  );
  await ready();
  fireEvent.click(addButton());
  expect(
    await screen.findByText('This device already has a passkey for jun@example.com.'),
  ).toBeInTheDocument();
  expect(captureException).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(mockAuth.continueAfterSignIn).toHaveBeenCalledTimes(1);
});

it('goes back to the offer when the passkey prompt is closed', async () => {
  steps.enrollPasskey.mockRejectedValue(new DOMException('closed', 'NotAllowedError'));
  await ready();
  fireEvent.click(addButton());
  await waitFor(() => expect(addButton()).not.toHaveAttribute('aria-busy'));
  expect(screen.queryByText(/Couldn’t add a passkey/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
  expect(mockAuth.continueAfterSignIn).not.toHaveBeenCalled();
});

it('says it couldn’t add one when accounts refuses it, and lets the sign-in go on', async () => {
  vi.mocked(addAuthenticator).mockRejectedValue(new Error('Could not add the passkey'));
  await ready();
  fireEvent.click(addButton());
  expect(
    await screen.findByText('Couldn’t add a passkey. You can keep using email codes.'),
  ).toBeInTheDocument();
  expect(captureException).toHaveBeenCalled();
  expect(mockAuth.setUser).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(mockAuth.continueAfterSignIn).toHaveBeenCalledTimes(1);
});

it('says it couldn’t add one when it can’t get ready, and lets the sign-in go on', async () => {
  steps.prepareEnrollment.mockRejectedValue(new Error('no session'));
  render(<PasskeyOffer />);
  expect(
    await screen.findByText('Couldn’t add a passkey. You can keep using email codes.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add a passkey' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(mockAuth.continueAfterSignIn).toHaveBeenCalledTimes(1);
});
