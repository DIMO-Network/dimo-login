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
const mockUpdate = jest.fn();
const mockFinishShare = jest.fn();
jest.mock('../../../hooks', () => ({
  useUpdateVehiclePermissions: () => mockUpdate,
  useFinishShareVehicles: () => mockFinishShare,
}));
const mockUi = {
  componentData: {} as Record<string, unknown>,
  setUiState: jest.fn(),
  setComponentData: jest.fn(),
  setLoadingState: jest.fn(),
  setError: jest.fn(),
  error: null,
};
jest.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => mockUi,
}));
jest.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: '0x2222222222222222222222222222222222222222',
    expirationDate: BigInt(4102444800),
  }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({
    user: { smartContractAddress: '0x1111111111111111111111111111111111111111' },
  }),
}));
// Keep the turnkey-backed services and shared UI out of the module graph.
jest.mock('../../../services', () => ({}));
jest.mock('../../../utils/authUtils', () => ({ isInvalidSessionError: () => false }));
jest.mock('@sentry/react', () => ({ captureException: jest.fn() }));
jest.mock('../../Shared', () => ({
  UIManagerLoaderWrapper: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  ErrorMessage: ({ message }: { message: string }) => <p>{message}</p>,
}));
jest.mock('../ManageVehicleDetails', () => ({ ManageVehicleDetails: () => null }));

import { ManageVehicle } from '../ManageVehicle';
import { UiStates } from '../../../enums';

// The grant has non-location history only (permission 1 at bits 2..3).
const sharedVehicle = () => ({
  tokenId: 1,
  tokenDID: 'did:erc721:137:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:1',
  imageURI: '',
  make: 'Tesla',
  model: 'Model 3',
  year: 2020,
  shared: true,
  expiresAt: '01/01/2027',
  grantExpiresAt: '2027-01-01T00:00:00Z',
  permissions: (BigInt(3) << BigInt(2)).toString(),
  source: '',
});

const renderManage = (requestedPermissions: string) => {
  mockUi.componentData = { vehicle: sharedVehicle(), permissions: requestedPermissions };
  render(<ManageVehicle />);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockResolvedValue(undefined);
});

it('reports an update to the app the way a share from the list is reported', async () => {
  // The app now also asks for commands, which the grant lacks.
  renderManage('11');
  fireEvent.click(screen.getByRole('button', { name: 'Update permissions' }));

  await waitFor(() =>
    expect(mockFinishShare).toHaveBeenCalledWith([
      expect.objectContaining({ tokenId: 1, shared: false }),
    ]),
  );
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ action: 'update' }));
  // useFinishShareVehicles shows the success screen after telling the app.
  expect(mockUi.setUiState).not.toHaveBeenCalled();
});

it.each([
  ['Extend (1 year)', 'extend', 'extended'],
  ['Stop sharing', 'revoke', 'revoked'],
])('%s still goes straight to its success screen', async (button, action, done) => {
  // The grant already covers the request, so Extend is offered.
  renderManage('1');
  fireEvent.click(screen.getByRole('button', { name: button }));

  await waitFor(() =>
    expect(mockUi.setUiState).toHaveBeenCalledWith(UiStates.VEHICLES_SHARED_SUCCESS),
  );
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ action }));
  expect(mockUi.setComponentData).toHaveBeenCalledWith({
    action: done,
    vehicles: [expect.objectContaining({ tokenId: 1, shared: false })],
  });
  expect(mockFinishShare).not.toHaveBeenCalled();
});
