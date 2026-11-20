/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// The package ships ESM only; mirror its Permission enum and 2-bit encoding.
vi.mock('@dimo-network/transactions', async () => {
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
const mockUpdate = vi.fn();
const mockFinishShare = vi.fn();
const mockFinish = vi.fn();
vi.mock('../../../hooks/useUpdateVehiclePermissions', () => ({
  useUpdateVehiclePermissions: () => mockUpdate,
}));
vi.mock('../../../hooks/useFinishShareVehicles', () => ({
  useFinishShareVehicles: () => mockFinishShare,
  useFinishVehicles: () => mockFinish,
}));
const mockUi = {
  componentData: {} as Record<string, unknown>,
  setUiState: vi.fn(),
  setComponentData: vi.fn(),
  setBusy: vi.fn(),
};
vi.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => mockUi,
}));
const mockClientId = '0x2222222222222222222222222222222222222222';
const mockCreds: Record<string, unknown> = {};
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: mockClientId,
    devLicenseAlias: 'Acme',
    expirationDate: BigInt(4102444800),
    ...mockCreds,
  }),
}));
const mockUser: { smartContractAddress: string; email?: string } = {
  smartContractAddress: '0x1111111111111111111111111111111111111111',
};
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ user: mockUser }),
}));
const mockReadGrant = vi.fn();
vi.mock('../../../services/vehicleDocumentAgreements', async () => ({
  ...(await vi.importActual<object>('../../../services/vehicleDocumentAgreements')),
  readGrantAgreements: (...args: unknown[]) => mockReadGrant(...args),
}));
vi.mock('../../../utils/authUtils', () => ({ isInvalidSessionError: () => false }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import { ManageVehicle } from '../ManageVehicle';
import { getEmailChoice } from '../../../services/storageService';
import {
  clearDeclined,
  loadDeclined,
  NOTHING_DECLINED,
  requestKey,
  saveDeclined,
} from '../../../utils/declinedPermissions';

// The grant has non-location history only (permission 1 at bits 2..3).
const sharedVehicle = () => ({
  tokenId: 1,
  tokenDID: 'did:erc721:137:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:1',
  imageURI: '',
  make: 'Tesla',
  model: 'Model 3',
  year: 2020,
  shared: true,
  grantExpiresAt: '2027-01-01T00:00:00Z',
  permissions: (BigInt(3) << BigInt(2)).toString(),
  source: '',
});

const renderManage = (requestedPermissions: string) => {
  mockUi.componentData = { vehicle: sharedVehicle(), permissions: requestedPermissions };
  render(<ManageVehicle />);
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  clearDeclined();
  Object.keys(mockCreds).forEach((key) => delete mockCreds[key]);
  delete mockUser.email;
  mockUpdate.mockResolvedValue(undefined);
  mockReadGrant.mockResolvedValue([]);
});

it('reports an update to the app the way a share from the list is reported', async () => {
  // The app now also asks for commands, which the grant lacks.
  renderManage('11');
  expect(screen.getByText('Acme is asking for more access')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Update permissions' }));

  await waitFor(() =>
    expect(mockFinishShare).toHaveBeenCalledWith([
      expect.objectContaining({
        vehicle: expect.objectContaining({ tokenId: 1 }),
        outcome: 'updated',
        // The request runs to 2100, past the current grant.
        expiration: BigInt(4102444800),
      }),
    ]),
  );
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ action: 'update' }));
  expect(mockFinish).not.toHaveBeenCalled();
});

it('extends by a year from the current end and tells the app', async () => {
  // The grant already covers the request, so Extend is offered.
  renderManage('1');
  fireEvent.click(screen.getByRole('button', { name: 'Extend 1 year' }));

  const nextYear = BigInt(Date.parse('2028-01-01T00:00:00Z') / 1000);
  await waitFor(() =>
    expect(mockFinish).toHaveBeenCalledWith('extended', [
      {
        vehicle: expect.objectContaining({ tokenId: 1 }),
        outcome: 'extended',
        expiration: nextYear,
      },
    ]),
  );
  expect(mockUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'extend', expiration: nextYear }),
  );
});

it('asks before stopping, then tells the app', async () => {
  renderManage('1');
  fireEvent.click(screen.getByRole('button', { name: 'Stop sharing' }));

  const dialog = screen.getByRole('alertdialog', { name: 'Stop sharing this vehicle?' });
  expect(mockUpdate).not.toHaveBeenCalled();
  // Focus starts on the safe choice.
  expect(within(dialog).getByRole('button', { name: 'Keep sharing' })).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Stop sharing' }));

  await waitFor(() =>
    expect(mockFinish).toHaveBeenCalledWith('revoked', [
      { vehicle: expect.objectContaining({ tokenId: 1 }), outcome: 'revoked' },
    ]),
  );
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ action: 'revoke' }));
});

it('keeps sharing when the confirmation is declined', () => {
  renderManage('1');
  fireEvent.click(screen.getByRole('button', { name: 'Stop sharing' }));
  fireEvent.click(screen.getByRole('button', { name: 'Keep sharing' }));

  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(mockUpdate).not.toHaveBeenCalled();
});

it('offers no Extend on a share with no end date', () => {
  mockUi.componentData = {
    vehicle: { ...sharedVehicle(), grantExpiresAt: '2125-01-01T00:00:00Z' },
    permissions: '1',
  };
  render(<ManageVehicle />);

  expect(screen.queryByRole('button', { name: 'Extend 1 year' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Stop sharing' })).toBeInTheDocument();
  expect(screen.getByText('No end date')).toBeInTheDocument();
});

it('says what went wrong and changes nothing when the update fails', async () => {
  mockUpdate.mockRejectedValue(new Error('network'));
  renderManage('1');
  fireEvent.click(screen.getByRole('button', { name: 'Extend 1 year' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t change sharing');
  expect(mockFinish).not.toHaveBeenCalled();
  expect(mockUi.setBusy).toHaveBeenLastCalledWith(false);
});

describe('a required email', () => {
  beforeEach(() => {
    mockCreds.emailRequest = 'required';
    mockUser.email = 'jun@example.com';
  });

  it('is listed with an update and shared when it goes through', async () => {
    renderManage('11');
    expect(screen.getByText('Email address')).toBeInTheDocument();
    expect(screen.getByText(/Updating adds .*Email address/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update permissions' }));

    await waitFor(() => expect(mockFinishShare).toHaveBeenCalled());
    expect(getEmailChoice(mockClientId, 'jun@example.com')).toBe(true);
  });

  it('is shared with an extension too', async () => {
    renderManage('1');
    fireEvent.click(screen.getByRole('button', { name: 'Extend 1 year' }));

    await waitFor(() => expect(mockFinish).toHaveBeenCalled());
    expect(getEmailChoice(mockClientId, 'jun@example.com')).toBe(true);
  });

  it('is not shared by stopping', async () => {
    renderManage('1');
    fireEvent.click(screen.getByRole('button', { name: 'Stop sharing' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Stop sharing',
      }),
    );
    await waitFor(() => expect(mockFinish).toHaveBeenCalled());
    expect(getEmailChoice(mockClientId, 'jun@example.com')).toBeUndefined();
  });

  it('is not listed once this account has shared it', () => {
    localStorage.setItem(`email_granted_${mockClientId}_jun@example.com`, 'true');
    renderManage('11');
    expect(screen.queryByText('Email address')).toBeNull();
  });
});

it('marks a request for more of a document type as New, as Update signs it', async () => {
  // The grant shares one vehicle document; the app now asks for all of them.
  mockCreds.cloudEvent = [{ eventType: 'dimo.document.vehicle.*', ids: [], tags: [] }];
  mockReadGrant.mockResolvedValue([
    {
      eventType: 'dimo.document.vehicle.*',
      source: '0x1111111111111111111111111111111111111111',
      ids: ['doc-1'],
      tags: [],
    },
  ]);
  mockUi.componentData = {
    vehicle: { ...sharedVehicle(), documentAccess: false },
    permissions: '1',
  };
  render(<ManageVehicle />);

  expect(
    await screen.findByText(
      'Updating adds Vehicle documents. Everything else stays the same.',
    ),
  ).toBeInTheDocument();
  const item = screen
    .getAllByRole('listitem')
    .find((li) => within(li).queryByText('Vehicle documents'))!;
  expect(within(item).getByText('New')).toBeInTheDocument();
  expect(screen.getAllByText('Vehicle documents')).toHaveLength(1);
});

it('offers no Extend and still shows the screen when the end date is unknown', () => {
  for (const grantExpiresAt of ['', 'not a date']) {
    mockUi.componentData = {
      vehicle: { ...sharedVehicle(), grantExpiresAt },
      permissions: '1',
    };
    const { unmount } = render(<ManageVehicle />);
    expect(screen.queryByRole('button', { name: 'Extend 1 year' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Stop sharing' })).toBeInTheDocument();
    unmount();
  }
});

describe('with part of the request switched off', () => {
  const VEHICLE_DATA = 1;
  const COMMANDS = 2;

  // The share has vehicle data and commands.
  const fullyShared = () => ({
    ...sharedVehicle(),
    permissions: (BigInt(15) << BigInt(2)).toString(),
  });

  it('offers to remove a switched-off permission the share has', async () => {
    // The app asks for vehicle data and commands; the user switched commands off.
    saveDeclined(requestKey(mockClientId, '11'), { permissions: [COMMANDS], files: [] });
    mockUi.componentData = { vehicle: fullyShared(), permissions: '11' };
    render(<ManageVehicle />);

    expect(screen.getByText('Some access is switched off')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Updating removes Lock and unlock. Everything else stays the same.',
      ),
    ).toBeInTheDocument();
    // What the app can access once updated.
    expect(screen.queryByText('Lock and unlock')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Update permissions' }));

    await waitFor(() => expect(mockFinishShare).toHaveBeenCalled());
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        permissions: '10000000',
        declined: [COMMANDS],
      }),
    );
    expect(loadDeclined(requestKey(mockClientId, '11'))).toEqual(NOTHING_DECLINED);
  });

  it('offers no Update that would leave the share with nothing', async () => {
    // Everything the app asks for is switched off.
    saveDeclined(requestKey(mockClientId, '11'), {
      permissions: [VEHICLE_DATA, COMMANDS],
      files: [],
    });
    renderManage('11');

    expect(screen.queryByRole('button', { name: 'Update permissions' })).toBeNull();
    // Extend keeps the share exactly as it is.
    fireEvent.click(screen.getByRole('button', { name: 'Extend 1 year' }));
    await waitFor(() => expect(mockFinish).toHaveBeenCalled());
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'extend', declined: [] }),
    );
  });

  it('does not ask for what was switched off', () => {
    // The app asks for commands too, but the user switched it off.
    saveDeclined(requestKey(mockClientId, '11'), { permissions: [COMMANDS], files: [] });
    renderManage('11');

    expect(screen.queryByText('Acme is asking for more access')).toBeNull();
    expect(screen.getByRole('button', { name: 'Extend 1 year' })).toBeInTheDocument();
  });
});

describe('with a kind of document switched off', () => {
  const RAW = { eventType: 'dimo.raw.vehicle.*', ids: [], tags: [] };
  const DOCS = { eventType: 'dimo.document.vehicle.*', ids: [], tags: [] };

  it('offers to remove it from a share that has it, and passes it to Update', async () => {
    // The share has vehicle data and original files; the app asks for both
    // kinds of document, and the user switched original files off.
    mockCreds.cloudEvent = [DOCS, RAW];
    mockReadGrant.mockResolvedValue([{ ...RAW, source: mockUser.smartContractAddress }]);
    saveDeclined(requestKey(mockClientId, '1'), {
      permissions: [],
      files: ['document.raw_vehicle'],
    });
    renderManage('1');

    expect(
      await screen.findByText(
        'Updating adds Vehicle documents and removes Original vehicle document files. Everything else stays the same.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update permissions' }));

    await waitFor(() => expect(mockFinishShare).toHaveBeenCalled());
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        declined: [],
        declinedFiles: ['document.raw_vehicle'],
      }),
    );
  });

  it("doesn't ask for a kind that's switched off", async () => {
    mockCreds.cloudEvent = [RAW];
    // The share has no files; the app asks for original files, switched off.
    saveDeclined(requestKey(mockClientId, '1'), {
      permissions: [],
      files: ['document.raw_vehicle'],
    });
    renderManage('1');

    expect(
      await screen.findByRole('button', { name: 'Extend 1 year' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/asking for more access/)).toBeNull();
  });
});
