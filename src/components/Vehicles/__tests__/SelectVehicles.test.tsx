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
jest.mock('../../../hooks', () => ({
  useFetchVehicles: () => ({
    fetchVehicles: () => Promise.resolve(),
    vehicles: [mockRav4, mockTesla],
    incompatibleVehicles: [],
    hasNextPage: false,
    hasPreviousPage: false,
  }),
  useShareVehicles: () => mockShare,
  useFinishShareVehicles: () => mockFinish,
}));
jest.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: mockClientId,
    devLicenseAlias: 'Acme',
    redirectUri: 'https://acme.example/callback',
    permissions: '11',
    expirationDate: mockExpiration,
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
jest.mock('@sentry/react', () => ({ captureException: jest.fn() }));

import { SelectVehicles } from '../SelectVehicles';
import { setForceEmail } from '../../../stores/AuthStateStore';
import { isEmailGranted } from '../../../services/storageService';

const cta = () => screen.getAllByRole('button').at(-1) as HTMLElement;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  setForceEmail(false);
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

it('holds sharing until the email is shared when the app requires it', async () => {
  setForceEmail(true);
  render(<SelectVehicles />);
  await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));

  expect(cta()).toHaveAttribute('aria-disabled', 'true');
  expect(cta()).toHaveAccessibleDescription(
    'Acme needs your email. Turn on email sharing below to continue.',
  );
  fireEvent.click(cta());
  expect(mockShare).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('switch', { name: /Share my email with Acme/ }));
  expect(isEmailGranted(mockClientId, 'jun@example.com')).toBe(true);
  expect(cta()).not.toHaveAttribute('aria-disabled');
});

it("doesn't ask for the email again once this account shared it", async () => {
  localStorage.setItem(`email_granted_${mockClientId}_jun@example.com`, 'true');
  render(<SelectVehicles />);
  await screen.findByText('Needs update');
  expect(screen.queryByRole('switch')).toBeNull();
});
