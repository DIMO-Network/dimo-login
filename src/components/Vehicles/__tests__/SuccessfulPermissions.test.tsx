/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@dimo-network/transactions', () => ({ ENVIRONMENT: 'mock', Permission: {} }));
jest.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    devLicenseAlias: 'Toyota',
    permissions: '11111111',
    redirectUri: 'https://app.example/cb',
    utm: '',
  }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ jwt: 'jwt', user: {} }),
}));
const mockComponentData: Record<string, unknown> = {};
jest.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => ({ componentData: mockComponentData }),
}));
jest.mock('../../../utils/authUtils', () => ({
  buildAuthPayload: () => ({ token: 'jwt', walletAddress: '0xabc' }),
}));
const mockBack = jest.fn();
jest.mock('../../../utils/messageHandler', () => ({
  backToThirdParty: (...args: unknown[]) => mockBack(...args),
}));
jest.mock('../../../utils/isEmbed', () => ({ isEmbed: () => false }));

import { SuccessfulPermissions } from '../SuccessfulPermissions';

const vehicle = (tokenId: number, make = 'Ford', model = 'F-150') => ({
  tokenId,
  make,
  model,
  year: 2022,
});
const seconds = (iso: string) => BigInt(Date.parse(iso) / 1000);
const NO_END = seconds('2125-10-27T00:00:00Z');

const show = (data: Record<string, unknown>) => {
  Object.keys(mockComponentData).forEach((key) => delete mockComponentData[key]);
  Object.assign(mockComponentData, data);
  render(<SuccessfulPermissions />);
};

beforeEach(() => jest.clearAllMocks());

it('shows each shared vehicle with the date sharing ends', () => {
  show({
    action: 'shared',
    results: [
      {
        vehicle: vehicle(1),
        outcome: 'shared',
        expiration: seconds('2027-10-27T12:00:00Z'),
      },
      {
        vehicle: vehicle(2, 'Mazda', 'CX-5'),
        outcome: 'shared',
        expiration: seconds('2027-10-27T12:00:00Z'),
      },
    ],
  });

  expect(
    screen.getByRole('heading', { name: 'Shared 2 vehicles with Toyota' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Toyota can access them until Oct 27, 2027.'),
  ).toBeInTheDocument();
  expect(screen.getAllByText('Shared until Oct 27, 2027')).toHaveLength(2);
  expect(
    screen.getByText('You can change or stop sharing anytime in the DIMO app.'),
  ).toBeInTheDocument();
});

it('says "no end date" for the 100-year default', () => {
  show({
    action: 'shared',
    results: [{ vehicle: vehicle(1), outcome: 'shared', expiration: NO_END }],
  });
  expect(
    screen.getByText('Toyota can access it until you stop sharing.'),
  ).toBeInTheDocument();
  expect(screen.getByText('Shared, no end date')).toBeInTheDocument();
});

it('reports updates as updates, not as new shares', () => {
  show({
    action: 'shared',
    results: [{ vehicle: vehicle(1), outcome: 'updated', expiration: NO_END }],
  });
  expect(
    screen.getByRole('heading', { name: 'Updated sharing for 1 vehicle' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Updated')).toBeInTheDocument();
});

it('shows the new end date after extending', () => {
  show({
    action: 'extended',
    results: [
      {
        vehicle: vehicle(1),
        outcome: 'extended',
        expiration: seconds('2028-01-01T12:00:00Z'),
      },
    ],
  });
  expect(screen.getByRole('heading', { name: 'Sharing extended' })).toBeInTheDocument();
  expect(
    screen.getByText('Your 2022 Ford F-150 stays shared with Toyota until Jan 1, 2028.'),
  ).toBeInTheDocument();
});

it('confirms a stop, and sends the stopped vehicles back in redirect mode', () => {
  show({
    action: 'revoked',
    results: [{ vehicle: vehicle(7), outcome: 'revoked' }],
  });
  expect(screen.getByRole('heading', { name: 'Sharing stopped' })).toBeInTheDocument();
  expect(screen.getByText('Stopped')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Back to Toyota' }));
  expect(mockBack).toHaveBeenCalledWith(
    { token: 'jwt', walletAddress: '0xabc', revokedVehicles: '7' },
    'https://app.example/cb',
    '',
  );
});

it('lists vehicles whose update was skipped, with the reason', () => {
  show({
    action: 'shared',
    results: [{ vehicle: vehicle(1), outcome: 'shared', expiration: NO_END }],
    skipped: [
      {
        vehicle: vehicle(5),
        reason: "Couldn't read the current sharing terms for Ford F-150. Try again.",
      },
    ],
  });

  expect(screen.getByText('1 vehicle wasn’t updated')).toBeInTheDocument();
  expect(
    screen.getByText(
      "Couldn't read the current sharing terms for Ford F-150. Try again.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText(/still shared as before/)).toBeInTheDocument();
});

it('shows nothing extra when every vehicle was shared', () => {
  show({
    action: 'shared',
    results: [{ vehicle: vehicle(1), outcome: 'shared', expiration: NO_END }],
    skipped: [],
  });
  expect(screen.queryByText(/updated/)).toBeNull();
});
