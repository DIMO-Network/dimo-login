/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@dimo-network/transactions', () => ({ ENVIRONMENT: 'mock', Permission: {} }));
jest.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({ devLicenseAlias: 'Toyota', permissions: '11111111' }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ jwt: 'jwt', user: {} }),
}));
const mockComponentData: Record<string, unknown> = {};
jest.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => ({ componentData: mockComponentData }),
}));
jest.mock('../../../utils/authUtils', () => ({ buildAuthPayload: jest.fn() }));
jest.mock('../../../utils/messageHandler', () => ({ backToThirdParty: jest.fn() }));
jest.mock('../../Shared', () => ({
  Header: ({ title }: { title: string }) => <h1>{title}</h1>,
  PrimaryButton: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));
jest.mock('../VehicleCard', () => () => null);

import { SuccessfulPermissions } from '../SuccessfulPermissions';

const ford = { tokenId: 5, make: 'Ford', model: 'F-150' };

it('lists vehicles whose update was skipped, with the reason', () => {
  Object.assign(mockComponentData, {
    action: 'shared',
    vehicles: [{ tokenId: 1 }],
    skipped: [
      {
        vehicle: ford,
        reason: "Couldn't read the current sharing terms for Ford F-150. Try again.",
      },
    ],
  });
  render(<SuccessfulPermissions />);

  expect(screen.getByText('1 vehicle was not updated')).toBeInTheDocument();
  expect(
    screen.getByText(
      "Couldn't read the current sharing terms for Ford F-150. Try again.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText(/still shared as before/)).toBeInTheDocument();
});

it('shows nothing extra when every vehicle was shared', () => {
  Object.assign(mockComponentData, {
    action: 'shared',
    vehicles: [{ tokenId: 1 }],
    skipped: [],
  });
  render(<SuccessfulPermissions />);
  expect(screen.queryByText(/not updated/)).toBeNull();
});
