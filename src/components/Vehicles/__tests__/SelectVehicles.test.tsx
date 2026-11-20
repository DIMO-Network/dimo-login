/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// The package ships ESM only; mirror its Permission enum and 2-bit encoding.
vi.mock('@dimo-network/transactions', () => {
  const names = [
    'GetNonLocationHistory',
    'ExecuteCommands',
    'GetCurrentLocation',
    'GetLocationHistory',
    'GetVINCredential',
    'GetLiveData',
    'GetRawData',
    'GetApproximateLocation',
  ];
  const Permission: Record<string | number, string | number> = {};
  names.forEach((name, i) => {
    Permission[name] = i + 1;
    Permission[i + 1] = name;
  });
  return {
    Permission,
    getPermissionsArray: (value: bigint) =>
      names
        .map((_, i) => i + 1)
        .filter((p) => ((value >> BigInt(p * 2)) & BigInt(3)) === BigInt(3)),
  };
});

const mockClientId = '0x2222222222222222222222222222222222222222';
const mockExpiration = BigInt(Date.parse('2027-10-27T12:00:00Z') / 1000);

// Shared with vehicle data only; the app now also asks for commands ('11').
const mockTesla = {
  tokenId: 1,
  tokenDID: 'did:erc721:137:0xvehicles:1',
  imageURI: '',
  make: 'Tesla',
  model: 'Model 3',
  year: 2021,
  shared: true,
  grantExpiresAt: '2027-01-01T00:00:00Z',
  permissions: (BigInt(3) << BigInt(2)).toString(),
  source: '',
};
const mockRav4 = {
  ...mockTesla,
  tokenId: 2,
  make: 'Toyota',
  model: 'RAV4',
  year: 2022,
  shared: false,
  grantExpiresAt: '',
  permissions: '0',
};

const mockShare = vi.fn();
const mockFinish = vi.fn();
const mockIncompatible: unknown[] = [];
let mockVehicles: unknown[] = [];
vi.mock('../../../hooks/useFetchVehicles', () => ({
  useFetchVehicles: () => ({
    fetchVehicles: () => Promise.resolve(),
    vehicles: mockVehicles,
    incompatibleVehicles: mockIncompatible,
    hasNextPage: false,
    hasPreviousPage: false,
  }),
}));
vi.mock('../../../hooks/useShareVehicles', () => ({
  useShareVehicles: () => mockShare,
}));
vi.mock('../../../hooks/useFinishShareVehicles', () => ({
  useFinishShareVehicles: () => mockFinish,
}));
const mockCreds: Record<string, unknown> = {};
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: mockClientId,
    devLicenseAlias: 'Acme',
    redirectUri: 'https://acme.example/callback',
    permissions: '11',
    expirationDate: mockExpiration,
    ...mockCreds,
  }),
}));
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ user: { email: 'jun@example.com' } }),
}));
vi.mock('../../../context/OraclesContext', () => ({
  useOracles: () => ({ onboardingEnabled: false }),
}));
const mockUi = {
  componentData: {},
  setComponentData: vi.fn(),
  setUiState: vi.fn(),
  setBusy: vi.fn(),
};
vi.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => mockUi,
}));
vi.mock('../../../utils/authUtils', () => ({ isInvalidSessionError: () => false }));
const mockSendError = vi.fn();
vi.mock('../../../utils/errorUtils', () => ({
  sendErrorToParent: (...args: unknown[]) => mockSendError(...args),
}));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import { SelectVehicles } from '../SelectVehicles';
import { getEmailChoice } from '../../../services/storageService';
import {
  clearDeclined,
  loadDeclined,
  requestKey,
} from '../../../utils/declinedPermissions';

const cta = () => screen.getAllByRole('button').at(-1) as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  clearDeclined();
  Object.keys(mockCreds).forEach((key) => delete mockCreds[key]);
  mockIncompatible.length = 0;
  mockVehicles = [mockRav4, mockTesla];
  mockShare.mockImplementation(async (vehicles) => ({ shared: vehicles, skipped: [] }));
});

it('offers the outdated share as an update and names the button after what it does', async () => {
  render(<SelectVehicles />);

  expect(
    screen.getByRole('heading', { name: 'Acme wants access to your vehicles' }),
  ).toBeInTheDocument();
  expect(screen.getByText('acme.example')).toBeInTheDocument();
  expect(screen.getByText('Now also asks for Lock and unlock')).toBeInTheDocument();
  expect(await screen.findByText('Needs update')).toBeInTheDocument();
  expect(screen.getByText('Adds Lock and unlock')).toBeInTheDocument();

  // The outdated share starts selected.
  await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
  fireEvent.click(screen.getByLabelText(/2022 Toyota RAV4/));
  expect(cta()).toHaveTextContent('Share 1 · Update 1');
});

it('reports each vehicle as shared or updated, with its new end date', async () => {
  mockShare.mockImplementation(async (vehicles) => ({ shared: vehicles, skipped: [] }));
  render(<SelectVehicles />);
  fireEvent.click(await screen.findByLabelText(/2022 Toyota RAV4/));
  await waitFor(() => expect(cta()).toHaveTextContent('Share 1 · Update 1'));
  fireEvent.click(cta());

  await waitFor(() => expect(mockFinish).toHaveBeenCalled());
  const [results, skipped] = mockFinish.mock.calls[0];
  expect(skipped).toEqual([]);
  expect(results).toEqual(
    expect.arrayContaining([
      { vehicle: mockRav4, outcome: 'shared', expiration: mockExpiration },
      // The request ends later than the current grant, so the update takes it.
      { vehicle: mockTesla, outcome: 'updated', expiration: mockExpiration },
    ]),
  );
  expect(mockUi.setBusy).toHaveBeenCalledWith(true);
  expect(mockUi.setBusy).toHaveBeenLastCalledWith(false);
});

it('says nothing was shared when sharing fails, and offers to try again', async () => {
  mockShare.mockRejectedValue(new Error('network'));
  render(<SelectVehicles />);
  await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
  await screen.findByText('Needs update');
  fireEvent.click(cta());

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Couldn’t share your vehiclesNothing was shared.',
  );
  expect(cta()).toHaveTextContent('Try again');
  expect(mockFinish).not.toHaveBeenCalled();
});

const cancelled = (reason = 'User cancelled vehicle sharing') =>
  expect(mockSendError).toHaveBeenCalledWith(
    reason,
    'https://acme.example/callback',
    undefined,
    mockUi.setUiState,
  );

it('Cancel goes back to the app without the token', async () => {
  render(<SelectVehicles />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
  cancelled();
  expect(mockFinish).not.toHaveBeenCalled();
});

describe('with nothing new to share', () => {
  it('offers Cancel next to Continue when every vehicle is already shared', async () => {
    // The Tesla's share already covers vehicle data.
    mockCreds.permissions = '1';
    mockVehicles = [mockTesla];
    render(<SelectVehicles />);
    expect(
      await screen.findByText('All your vehicles are already shared'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    cancelled();
    expect(mockFinish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mockFinish).toHaveBeenCalledWith([]);
  });

  it('offers Cancel next to Continue when there are no vehicles', async () => {
    mockVehicles = [];
    render(<SelectVehicles />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    cancelled();
    expect(mockFinish).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });
});

it('lists a required email as part of the request and shares it on approve', async () => {
  // Old apps say this with forceEmail.
  mockCreds.forceEmail = true;
  render(<SelectVehicles />);
  await screen.findByText('Needs update');

  expect(screen.getByText('About you')).toBeInTheDocument();
  expect(screen.getByText('About your vehicles')).toBeInTheDocument();
  expect(screen.getByText('Email address')).toBeInTheDocument();
  expect(screen.getByText('Required')).toBeInTheDocument();
  expect(screen.queryByRole('switch')).toBeNull();
  // Nothing to switch on first: approving the request shares it.
  expect(cta()).not.toHaveAttribute('aria-disabled');
  fireEvent.click(cta());

  await waitFor(() => expect(mockFinish).toHaveBeenCalled());
  expect(getEmailChoice(mockClientId, 'jun@example.com')).toBe(true);
});

it('records an optional email only when the request is approved', async () => {
  render(<SelectVehicles />);
  await screen.findByText('Needs update');
  const toggle = screen.getByRole('switch', { name: /Share my email with Acme/ });
  expect(toggle).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(toggle);

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(getEmailChoice(mockClientId, 'jun@example.com')).toBeUndefined();

  fireEvent.click(cta());
  await waitFor(() => expect(mockShare).toHaveBeenCalled());
  await waitFor(() => expect(getEmailChoice(mockClientId, 'jun@example.com')).toBe(true));
});

it('starts from the answer this account gave the app before', async () => {
  localStorage.setItem(`email_granted_${mockClientId}_jun@example.com`, 'true');
  render(<SelectVehicles />);
  await screen.findByText('Needs update');
  expect(
    screen.getByRole('switch', { name: /Share my email with Acme/ }),
  ).toHaveAttribute('aria-checked', 'true');
});

it("doesn't mention the email when the app doesn't ask for it", async () => {
  mockCreds.emailRequest = 'none';
  render(<SelectVehicles />);
  await screen.findByText('Needs update');
  expect(screen.queryByText(/email/i)).toBeNull();
  expect(screen.queryByText('About you')).toBeNull();
});

describe('Cancel with a required email', () => {
  it('reports a decline while the email was never shared', async () => {
    mockCreds.emailRequest = 'required';
    render(<SelectVehicles />);
    await screen.findByText('Needs update');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    cancelled('User declined to share their email');
    expect(mockFinish).not.toHaveBeenCalled();
    expect(getEmailChoice(mockClientId, 'jun@example.com')).toBeUndefined();
  });

  it('reports a plain cancel once the email is shared', async () => {
    mockCreds.emailRequest = 'required';
    localStorage.setItem(`email_granted_${mockClientId}_jun@example.com`, 'true');
    render(<SelectVehicles />);
    await screen.findByText('Needs update');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    cancelled();
    expect(mockFinish).not.toHaveBeenCalled();
  });
});

it('still shows a share with the app on a vehicle outside its filters', async () => {
  mockIncompatible.push({
    ...mockTesla,
    tokenId: 3,
    make: 'Mazda',
    model: 'CX-5',
    grantExpiresAt: '2125-01-01T00:00:00Z',
  });
  render(<SelectVehicles />);
  await screen.findByText('Needs update');

  expect(screen.getByText('Not supported by this app')).toBeInTheDocument();
  expect(screen.getByText('Shared, no end date')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Manage sharing for .*Mazda/ })).toBeNull();
  expect(
    screen.getByRole('button', { name: /Manage sharing for .*Tesla/ }),
  ).toBeInTheDocument();
});

describe('switching off part of the request', () => {
  // The mocked Permission enum numbers them as the SDK does.
  const COMMANDS = 2;
  const chip = (name: RegExp) => screen.getByRole('button', { name });

  it('leaves a switched-off permission out of the share and the terms', async () => {
    render(<SelectVehicles />);
    await screen.findByText('Needs update');
    expect(screen.getByText('Tap an item to leave it out of this share.')).toBeVisible();
    expect(chip(/Lock and unlock/)).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(chip(/Lock and unlock/));
    expect(chip(/Lock and unlock/)).toHaveAttribute('aria-pressed', 'false');
    // The Tesla lacked only commands, so its share is current without them.
    expect(screen.queryByText('Needs update')).toBeNull();
    expect(cta()).toHaveTextContent('Select a vehicle');

    fireEvent.click(
      screen.getByRole('button', { name: 'What’s included and full terms' }),
    );
    const terms = screen.getByRole('dialog');
    expect(within(terms).getByText('Vehicle data')).toBeInTheDocument();
    expect(within(terms).queryByText('Lock and unlock')).toBeNull();
    fireEvent.click(within(terms).getAllByRole('button').at(-1) as HTMLElement);

    fireEvent.click(screen.getByLabelText(/2022 Toyota RAV4/));
    fireEvent.click(cta());
    await waitFor(() => expect(mockShare).toHaveBeenCalled());
    // Shared with what was switched off, so it's left out.
    expect(mockShare).toHaveBeenCalledWith([mockRav4], [COMMANDS], []);
  });

  it('brings a picked update back when its permission is switched on again', async () => {
    render(<SelectVehicles />);
    await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));

    fireEvent.click(chip(/Lock and unlock/));
    expect(cta()).toHaveTextContent('Select a vehicle');
    fireEvent.click(chip(/Lock and unlock/));
    expect(await screen.findByText('Needs update')).toBeInTheDocument();
    expect(cta()).toHaveTextContent('Update 1 vehicle');

    fireEvent.click(cta());
    await waitFor(() => expect(mockShare).toHaveBeenCalled());
    // Nothing switched off: the app's request as sent.
    expect(mockShare).toHaveBeenCalledWith([mockTesla], [], []);
  });

  it("won't share with every permission switched off", async () => {
    render(<SelectVehicles />);
    await screen.findByText('Needs update');
    fireEvent.click(screen.getByLabelText(/2022 Toyota RAV4/));
    fireEvent.click(chip(/Vehicle data/));
    fireEvent.click(chip(/Lock and unlock/));

    expect(screen.getByText('Turn on at least one item to share.')).toBeInTheDocument();
    expect(cta()).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(cta());
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('keeps what was switched off through Manage and back', async () => {
    const { unmount } = render(<SelectVehicles />);
    await screen.findByText('Needs update');
    fireEvent.click(chip(/Lock and unlock/));
    fireEvent.click(screen.getByRole('button', { name: /Manage sharing for .*Tesla/ }));

    expect(mockUi.setComponentData).toHaveBeenCalledWith({ vehicle: mockTesla });
    // Manage reads it from here.
    expect(loadDeclined(requestKey(mockClientId, '11')).permissions).toEqual([COMMANDS]);

    // Going back mounts the screen again.
    unmount();
    render(<SelectVehicles />);
    await screen.findByText('Select a vehicle');
    expect(chip(/Lock and unlock/)).toHaveAttribute('aria-pressed', 'false');
  });

  it('takes a switched-off permission off a share that has it', async () => {
    // The Tesla's share has vehicle data and commands; the app asks for both.
    mockVehicles = [{ ...mockTesla, permissions: (BigInt(15) << BigInt(2)).toString() }];
    render(<SelectVehicles />);
    expect(await screen.findByText('All your vehicles are already shared')).toBeVisible();

    fireEvent.click(chip(/Lock and unlock/));
    expect(await screen.findByText('Needs update')).toBeInTheDocument();
    expect(screen.getByText('Removes Lock and unlock')).toBeInTheDocument();
    await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
    fireEvent.click(cta());

    await waitFor(() => expect(mockShare).toHaveBeenCalled());
    expect(mockShare.mock.calls[0][1]).toEqual([COMMANDS]);
    expect(loadDeclined(requestKey(mockClientId, '11')).permissions).toEqual([]);
  });

  it('locks the switches while sharing', async () => {
    let finishShare: () => void = () => {};
    mockShare.mockImplementation(
      (vehicles) =>
        new Promise((resolve) => {
          finishShare = () => resolve({ shared: vehicles, skipped: [] });
        }),
    );
    render(<SelectVehicles />);
    await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
    fireEvent.click(cta());

    await waitFor(() => expect(chip(/Lock and unlock/)).toBeDisabled());
    finishShare();
    await waitFor(() => expect(mockFinish).toHaveBeenCalled());
  });
});

describe('switching off a kind of document', () => {
  const chip = (name: RegExp) => screen.getByRole('button', { name });

  beforeEach(() => {
    // Vehicle data and vehicle documents.
    mockCreds.permissions = '1';
    mockCreds.cloudEvent = { eventType: 'dimo.document.vehicle.*' };
    mockVehicles = [mockRav4];
  });

  it('shares without it', async () => {
    render(<SelectVehicles />);
    fireEvent.click(await screen.findByLabelText(/2022 Toyota RAV4/));
    fireEvent.click(chip(/Vehicle documents/));
    expect(chip(/Vehicle documents/)).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(cta());

    await waitFor(() => expect(mockShare).toHaveBeenCalled());
    expect(mockShare).toHaveBeenCalledWith([mockRav4], [], ['document.vehicle']);
  });

  it("won't share documents on their own", async () => {
    render(<SelectVehicles />);
    fireEvent.click(await screen.findByLabelText(/2022 Toyota RAV4/));
    fireEvent.click(chip(/Vehicle data/));

    expect(
      screen.getByText(
        'Documents can’t be shared on their own. Turn on at least one other item.',
      ),
    ).toBeInTheDocument();
    expect(cta()).toHaveAttribute('aria-disabled', 'true');
  });

  it('takes it off a share that has it', async () => {
    mockVehicles = [
      {
        ...mockTesla,
        documentAccess: true,
        grantedFiles: [{ eventType: 'dimo.document.vehicle.*', ids: [], tags: [] }],
      },
    ];
    render(<SelectVehicles />);
    expect(await screen.findByText('All your vehicles are already shared')).toBeVisible();

    fireEvent.click(chip(/Vehicle documents/));
    expect(await screen.findByText('Removes Vehicle documents')).toBeInTheDocument();
    await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
  });
});
