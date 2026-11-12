/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AppAccess } from '../../../hooks/useConnectedApps';

const OWNER = '0x00000000000000000000000000000000000000aa';
const ACME = '0x00000000000000000000000000000000000000b1';
const UNNAMED = '0x00000000000000000000000000000000000000b2';
const OTHER_APP = '0x2222222222222222222222222222222222222222';

const mockValidate = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({
    user: { email: 'jun@example.com', smartContractAddress: OWNER },
    validateSession: mockValidate,
  }),
}));
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: '0x1111111111111111111111111111111111111111',
    devLicenseAlias: 'DIMO',
    redirectUri: 'https://dimo.example/callback',
    utm: 'utm_source=app',
  }),
}));
const mockUi = { setBusy: vi.fn() };
vi.mock('../../../context/UIManagerContext', () => ({ useUIManager: () => mockUi }));
const mockApps = {
  grants: 'loading' as 'loading' | 'error' | AppAccess[],
  browserApps: [] as string[],
  nameOf: (address: string): string | null =>
    ({ [ACME]: 'Acme', [OTHER_APP]: 'Other App' })[address] ?? null,
  reload: vi.fn(),
  signOutHere: vi.fn(),
};
let mockHookCalls = 0;
vi.mock('../../../hooks/useConnectedApps', () => ({
  useConnectedApps: () => {
    mockHookCalls += 1;
    return mockApps;
  },
}));
vi.mock('../../../services/connectedAppsRevoke', () => ({ revokeAppAccess: vi.fn() }));
vi.mock('../../../utils/messageHandler', () => ({ backToThirdParty: vi.fn() }));
let mockEmbedded = false;
vi.mock('../../../utils/isEmbed', () => ({ isEmbed: () => mockEmbedded }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import { revokeAppAccess } from '../../../services/connectedAppsRevoke';
import { backToThirdParty } from '../../../utils/messageHandler';
import { ConnectedApps } from '../ConnectedApps';

const grant = (expiresAt: string) => ({
  grantee: ACME,
  permissions: '0xcc',
  expiresAt,
  source: 'ipfs://x',
});
const access = (
  grantee: string,
  vehicleCount: number,
  documents: boolean,
  expiresAt = '2030-10-27T00:00:00Z',
): AppAccess => ({
  grantee: grantee as `0x${string}`,
  vehicles: Array.from({ length: vehicleCount }, (_, i) => ({
    tokenId: i + 1,
    tokenDID: `did:erc721:137:0xv:${i + 1}`,
    name: `Vehicle ${i + 1}`,
    grant: grant(expiresAt),
  })),
  documents: documents ? grant(expiresAt) : null,
  expiresAt,
});

const ACME_ACCESS = access(ACME, 2, true);
const UNNAMED_ACCESS = access(UNNAMED, 1, false, '2130-01-01T00:00:00Z');

const opener = { postMessage: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  mockEmbedded = false;
  mockHookCalls = 0;
  mockApps.grants = [ACME_ACCESS, UNNAMED_ACCESS];
  mockApps.browserApps = [];
  mockValidate.mockResolvedValue(true);
  vi.mocked(revokeAppAccess).mockResolvedValue(undefined);
  Object.defineProperty(window, 'opener', { value: opener, configurable: true });
});
afterEach(() => {
  Object.defineProperty(window, 'opener', { value: null, configurable: true });
});

const rowFor = (name: string) => screen.getByRole('listitem', { name });

it('lists each app with what it can access and until when', () => {
  render(<ConnectedApps />);
  expect(screen.getByRole('heading', { name: 'Connected apps' })).toBeInTheDocument();
  expect(screen.getByText('Can access your data')).toBeInTheDocument();

  const acme = within(rowFor('Acme'));
  expect(acme.getByText('2 vehicles')).toBeInTheDocument();
  expect(acme.getByText('Your documents')).toBeInTheDocument();
  expect(acme.getByText('Until Oct 27, 2030')).toBeInTheDocument();

  // No license name: the address, and a grant with the default end shows none.
  const unnamed = within(rowFor('Account 0x0000…00b2'));
  expect(unnamed.getByText('1 vehicle')).toBeInTheDocument();
  expect(unnamed.queryByText('Your documents')).toBeNull();
  expect(unnamed.getByText('No end date')).toBeInTheDocument();
});

it('says when no app can access the data', () => {
  mockApps.grants = [];
  render(<ConnectedApps />);
  expect(screen.getByText('No apps can access your data.')).toBeInTheDocument();
});

it('offers to try again when the list can’t load', () => {
  mockApps.grants = 'error';
  render(<ConnectedApps />);
  expect(screen.getByText('Couldn’t load your apps. Try again.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(mockApps.reload).toHaveBeenCalled();
});

it('stops sharing only after a confirmation, then reloads the list', async () => {
  render(<ConnectedApps />);
  fireEvent.click(within(rowFor('Acme')).getByRole('button', { name: 'Stop sharing' }));
  expect(revokeAppAccess).not.toHaveBeenCalled();

  const dialog = screen.getByRole('alertdialog', { name: 'Stop sharing with Acme?' });
  expect(
    within(dialog).getByText(
      'Acme loses access from now on. It keeps any data it already has.',
    ),
  ).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Stop sharing' }));

  await waitFor(() => expect(revokeAppAccess).toHaveBeenCalledWith(OWNER, ACME_ACCESS));
  expect(mockValidate).toHaveBeenCalled();
  await waitFor(() => expect(mockApps.reload).toHaveBeenCalled());
  expect(mockUi.setBusy).toHaveBeenCalledWith(true);
  expect(mockUi.setBusy).toHaveBeenLastCalledWith(false);
  expect(opener.postMessage).not.toHaveBeenCalled();
});

it('keeps sharing when the confirmation is declined', () => {
  render(<ConnectedApps />);
  fireEvent.click(within(rowFor('Acme')).getByRole('button', { name: 'Stop sharing' }));
  fireEvent.click(screen.getByRole('button', { name: 'Keep sharing' }));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(revokeAppAccess).not.toHaveBeenCalled();
});

it('signs nothing without a wallet session (sign-in takes over)', async () => {
  mockValidate.mockResolvedValue(null);
  render(<ConnectedApps />);
  fireEvent.click(within(rowFor('Acme')).getByRole('button', { name: 'Stop sharing' }));
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Stop sharing' }),
  );
  await waitFor(() => expect(mockValidate).toHaveBeenCalled());
  expect(revokeAppAccess).not.toHaveBeenCalled();
});

it('says so when stopping fails, rather than assume it worked', async () => {
  vi.mocked(revokeAppAccess).mockRejectedValue(new Error('still in force'));
  render(<ConnectedApps />);
  fireEvent.click(within(rowFor('Acme')).getByRole('button', { name: 'Stop sharing' }));
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Stop sharing' }),
  );
  expect(
    await screen.findByText(
      'Couldn’t stop sharing with Acme. Check the list and try again.',
    ),
  ).toBeInTheDocument();
  expect(mockApps.reload).toHaveBeenCalled();
});

it('signs another app out of this browser, saying what that does', () => {
  mockApps.browserApps = [OTHER_APP];
  render(<ConnectedApps />);
  expect(screen.getByText('Signed in on this browser')).toBeInTheDocument();
  const row = within(rowFor('Other App'));
  expect(
    row.getByText(
      'Signs Other App out of DIMO login on this browser. The app itself may stay signed in until its session ends.',
    ),
  ).toBeInTheDocument();
  fireEvent.click(row.getByRole('button', { name: 'Sign out here' }));
  expect(mockApps.signOutHere).toHaveBeenCalledWith(OTHER_APP);
});

it('hides the browser section when no other app is signed in here', () => {
  render(<ConnectedApps />);
  expect(screen.queryByText('Signed in on this browser')).toBeNull();
});

it('goes back to the app with nothing but the redirect itself', () => {
  render(<ConnectedApps />);
  fireEvent.click(screen.getByRole('button', { name: 'Back to DIMO' }));
  expect(backToThirdParty).toHaveBeenCalledWith({}, 'https://dimo.example/callback', '');
  expect(opener.postMessage).not.toHaveBeenCalled();
});

it('refuses to show embedded', () => {
  mockEmbedded = true;
  render(<ConnectedApps />);
  expect(screen.getByText('Open this page in its own window.')).toBeInTheDocument();
  expect(screen.queryByText('Can access your data')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Stop sharing' })).toBeNull();
  // Nothing is read for a page that isn't shown.
  expect(mockHookCalls).toBe(0);
});
