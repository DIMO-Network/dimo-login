/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// The package ships ESM only; mirror its Permission enum and 2-bit encoding.
jest.mock('@dimo-network/transactions', () => {
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
  expiresAt: '',
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

const mockShare = jest.fn();
const mockFinish = jest.fn();
const mockIncompatible: unknown[] = [];
jest.mock('../../../hooks', () => ({
  useFetchVehicles: () => ({
    fetchVehicles: () => Promise.resolve(),
    vehicles: [mockRav4, mockTesla],
    incompatibleVehicles: mockIncompatible,
    hasNextPage: false,
    hasPreviousPage: false,
  }),
  useShareVehicles: () => mockShare,
  useFinishShareVehicles: () => mockFinish,
}));
const mockCreds: Record<string, unknown> = {};
jest.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: mockClientId,
    devLicenseAlias: 'Acme',
    redirectUri: 'https://acme.example/callback',
    permissions: '11',
    expirationDate: mockExpiration,
    ...mockCreds,
  }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ user: { email: 'jun@example.com' } }),
}));
jest.mock('../../../context/OraclesContext', () => ({
  useOracles: () => ({ onboardingEnabled: false }),
}));
const mockUi = {
  componentData: {},
  setComponentData: jest.fn(),
  setUiState: jest.fn(),
  setBusy: jest.fn(),
};
jest.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => mockUi,
}));
jest.mock('../../../utils/authUtils', () => ({ isInvalidSessionError: () => false }));
const mockSendError = jest.fn();
jest.mock('../../../utils/errorUtils', () => ({
  sendErrorToParent: (...args: unknown[]) => mockSendError(...args),
}));
jest.mock('@sentry/react', () => ({ captureException: jest.fn() }));

import { SelectVehicles } from '../SelectVehicles';
import { getEmailChoice } from '../../../services/storageService';

const cta = () => screen.getAllByRole('button').at(-1) as HTMLElement;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  Object.keys(mockCreds).forEach((key) => delete mockCreds[key]);
  mockIncompatible.length = 0;
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
  fireEvent.click(screen.getByLabelText(/Toyota RAV4 2022/));
  expect(cta()).toHaveTextContent('Share 1 · Update 1');
});

it('reports each vehicle as shared or updated, with its new end date', async () => {
  mockShare.mockImplementation(async (vehicles) => ({ shared: vehicles, skipped: [] }));
  render(<SelectVehicles />);
  fireEvent.click(await screen.findByLabelText(/Toyota RAV4 2022/));
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

it('Cancel goes back to the app with nothing shared', async () => {
  render(<SelectVehicles />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
  expect(mockFinish).toHaveBeenCalledWith([]);
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

    expect(mockSendError).toHaveBeenCalledWith(
      'User declined to share their email',
      'https://acme.example/callback',
      undefined,
      mockUi.setUiState,
    );
    expect(mockFinish).not.toHaveBeenCalled();
    expect(getEmailChoice(mockClientId, 'jun@example.com')).toBeUndefined();
  });

  it('returns to the app as usual once the email is shared', async () => {
    mockCreds.emailRequest = 'required';
    localStorage.setItem(`email_granted_${mockClientId}_jun@example.com`, 'true');
    render(<SelectVehicles />);
    await screen.findByText('Needs update');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockFinish).toHaveBeenCalledWith([]);
    expect(mockSendError).not.toHaveBeenCalled();
  });

  it('leaves an optional email’s Cancel as it was', async () => {
    render(<SelectVehicles />);
    await screen.findByText('Needs update');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockFinish).toHaveBeenCalledWith([]);
    expect(mockSendError).not.toHaveBeenCalled();
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
  expect(screen.queryByRole('button', { name: /Manage sharing for Mazda/ })).toBeNull();
  expect(
    screen.getByRole('button', { name: /Manage sharing for Tesla/ }),
  ).toBeInTheDocument();
});
