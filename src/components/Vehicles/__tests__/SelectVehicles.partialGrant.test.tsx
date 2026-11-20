/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
// The consent screen and the real share hook together: switching items off on
// the request card must only make the grant smaller. The flow still finishes
// and reports the vehicles to the app as usual. Only the wallet calls are
// mocked, so this checks what would be signed and sent on-chain.
import type { Mock } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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
vi.mock('../../../services/turnkeyService', () => ({
  generateIpfsSources: vi.fn(async () => 'ipfs://signed'),
  setVehiclePermissions: vi.fn(async () => undefined),
  setVehiclePermissionsBulk: vi.fn(async () => undefined),
  setVehiclePermissionsBatch: vi.fn(async () => undefined),
  VEHICLE_PERMISSIONS_BATCH_LIMIT: 24,
}));

// What the SDK sends for a typical request: vehicle data, current location,
// location history, VIN credential, live data and approximate location.
const REQUEST = '10111101';
const [VEHICLE_DATA, CURRENT_LOCATION, LOCATION_HISTORY, VIN, LIVE_DATA, APPROXIMATE] = [
  1, 3, 4, 5, 6, 8,
];
const grantOf = (...permissions: number[]) =>
  permissions
    .reduce((acc, p) => acc | (BigInt(3) << BigInt(p * 2)), BigInt(0))
    .toString();

const mockClientId = '0x2222222222222222222222222222222222222222';
const mockExpiration = BigInt(Date.parse('2027-10-27T12:00:00Z') / 1000);
const newCar = {
  tokenId: 2,
  tokenDID: 'did:erc721:137:0xvehicles:2',
  imageURI: '',
  make: 'Toyota',
  model: 'RAV4',
  year: 2022,
  shared: false,
  grantExpiresAt: '',
  permissions: '0',
  source: '',
};
const secondCar = { ...newCar, tokenId: 3, make: 'Ford', model: 'F-150' };
// Shared earlier with vehicle data only.
const sharedCar = {
  ...newCar,
  tokenId: 1,
  make: 'Tesla',
  model: 'Model 3',
  year: 2021,
  shared: true,
  grantExpiresAt: '2027-01-01T00:00:00Z',
  permissions: grantOf(VEHICLE_DATA),
};

let mockVehicles: unknown[] = [];
vi.mock('../../../hooks/useFetchVehicles', () => ({
  useFetchVehicles: () => ({
    fetchVehicles: () => Promise.resolve(),
    vehicles: mockVehicles,
    incompatibleVehicles: [],
    hasNextPage: false,
    hasPreviousPage: false,
  }),
}));
const mockFinish = vi.fn();
vi.mock('../../../hooks/useFinishShareVehicles', () => ({
  useFinishShareVehicles: () => mockFinish,
}));
const mockCreds: Record<string, unknown> = {};
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: mockClientId,
    devLicenseAlias: 'DIMO AI',
    redirectUri: 'https://ai.example/callback',
    permissions: REQUEST,
    expirationDate: mockExpiration,
    emailRequest: 'none',
    ...mockCreds,
  }),
}));
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({
    user: {
      email: 'jun@example.com',
      smartContractAddress: '0x1111111111111111111111111111111111111111',
    },
    validateSession: async () => true,
  }),
}));
vi.mock('../../../context/OraclesContext', () => ({
  useOracles: () => ({ onboardingEnabled: false }),
}));
vi.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => ({
    componentData: {},
    setComponentData: vi.fn(),
    setUiState: vi.fn(),
    setBusy: vi.fn(),
  }),
}));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import { SelectVehicles } from '../SelectVehicles';
import { clearDeclined } from '../../../utils/declinedPermissions';
import { clearGrantReadCache } from '../../../services/vehicleDocumentAgreements';
import {
  generateIpfsSources,
  setVehiclePermissions,
  setVehiclePermissionsBatch,
  setVehiclePermissionsBulk,
} from '../../../services/turnkeyService';

const cta = () => screen.getAllByRole('button').at(-1) as HTMLElement;
const switchOff = (...names: RegExp[]) =>
  names.forEach((name) => fireEvent.click(screen.getByRole('button', { name })));
const switchOffLocation = () =>
  switchOff(/Current location/, /Location history/, /Approximate location/);
// The permissions in each signed grant document.
const signed = () => (generateIpfsSources as Mock).mock.calls.map((call) => call[0]);

const originalFetch = global.fetch;
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  clearDeclined();
  clearGrantReadCache();
  Object.keys(mockCreds).forEach((key) => delete mockCreds[key]);
});
afterEach(() => {
  global.fetch = originalFetch;
});

it('shares a new vehicle with only what was left on, and finishes as usual', async () => {
  mockVehicles = [newCar];
  render(<SelectVehicles />);
  fireEvent.click(await screen.findByLabelText(/2022 Toyota RAV4/));
  switchOffLocation();
  fireEvent.click(cta());

  await waitFor(() => expect(mockFinish).toHaveBeenCalled());
  const kept = [VEHICLE_DATA, VIN, LIVE_DATA];
  expect(signed()).toEqual([kept]);
  const grant = (setVehiclePermissions as Mock).mock.calls[0][0];
  expect(grant.permissions).toEqual(kept);
  expect(grant.grantee).toBe(mockClientId);
  expect(grant.tokenId).toBe(BigInt(2));
  expect(grant.expiration).toBe(mockExpiration);
  // The app hears about the vehicle exactly as it would for a full grant.
  expect(mockFinish).toHaveBeenCalledWith(
    [{ vehicle: newCar, outcome: 'shared', expiration: mockExpiration }],
    [],
  );
});

it('narrows a several-vehicle share in one bulk grant too', async () => {
  mockVehicles = [newCar, secondCar];
  render(<SelectVehicles />);
  fireEvent.click(await screen.findByRole('button', { name: 'Select all' }));
  switchOffLocation();
  fireEvent.click(cta());

  await waitFor(() => expect(mockFinish).toHaveBeenCalled());
  const kept = [VEHICLE_DATA, VIN, LIVE_DATA];
  expect(signed()).toEqual([kept]);
  expect((setVehiclePermissionsBulk as Mock).mock.calls[0][0].permissions).toEqual(kept);
  expect(setVehiclePermissions).not.toHaveBeenCalled();
  expect(setVehiclePermissionsBatch).not.toHaveBeenCalled();
});

it('updates an earlier share with what was left on, keeping what it had', async () => {
  mockVehicles = [sharedCar];
  render(<SelectVehicles />);
  expect(
    await screen.findByText(
      'Adds Current location, Location history, Credentials, Live data, and Approximate location',
    ),
  ).toBeInTheDocument();
  switchOffLocation();
  expect(screen.getByText('Adds Credentials and Live data')).toBeInTheDocument();
  await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
  fireEvent.click(cta());

  await waitFor(() => expect(mockFinish).toHaveBeenCalled());
  const kept = [VEHICLE_DATA, VIN, LIVE_DATA];
  expect(signed()).toEqual([kept]);
  expect((setVehiclePermissions as Mock).mock.calls[0][0].permissions).toEqual(kept);
  expect(mockFinish.mock.calls[0][0][0].outcome).toBe('updated');
});

it('adds location to that share when it is asked for again and left on', async () => {
  // Shared earlier without location.
  mockVehicles = [{ ...sharedCar, permissions: grantOf(VEHICLE_DATA, VIN, LIVE_DATA) }];
  render(<SelectVehicles />);
  expect(
    await screen.findByText(
      'Adds Current location, Location history, and Approximate location',
    ),
  ).toBeInTheDocument();
  await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
  fireEvent.click(cta());

  await waitFor(() => expect(mockFinish).toHaveBeenCalled());
  const everything = [
    VEHICLE_DATA,
    CURRENT_LOCATION,
    LOCATION_HISTORY,
    VIN,
    LIVE_DATA,
    APPROXIMATE,
  ];
  expect(signed()).toEqual([everything]);
  expect((setVehiclePermissions as Mock).mock.calls[0][0].permissions).toEqual(
    everything,
  );
});

it('takes location off a share that already has it when it is switched off', async () => {
  // Shared earlier with everything the app asks for, location included.
  const everything = [
    VEHICLE_DATA,
    CURRENT_LOCATION,
    LOCATION_HISTORY,
    VIN,
    LIVE_DATA,
    APPROXIMATE,
  ];
  mockVehicles = [{ ...sharedCar, permissions: grantOf(...everything) }];
  render(<SelectVehicles />);
  expect(await screen.findByText('All your vehicles are already shared')).toBeVisible();

  switchOffLocation();
  expect(
    await screen.findByText(
      'Removes Current location, Location history, and Approximate location',
    ),
  ).toBeInTheDocument();
  await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
  fireEvent.click(cta());

  await waitFor(() => expect(mockFinish).toHaveBeenCalled());
  const kept = [VEHICLE_DATA, VIN, LIVE_DATA];
  expect(signed()).toEqual([kept]);
  expect((setVehiclePermissions as Mock).mock.calls[0][0].permissions).toEqual(kept);
  expect(mockFinish.mock.calls[0][0][0].outcome).toBe('updated');
});

it('keeps a permission the app no longer asks for, since it was never switched off', async () => {
  // Shared earlier with raw data too, which this request doesn't mention.
  const RAW_DATA = 7;
  mockVehicles = [
    { ...sharedCar, permissions: grantOf(VEHICLE_DATA, LOCATION_HISTORY, RAW_DATA) },
  ];
  render(<SelectVehicles />);
  await screen.findByText('Needs update');
  switchOffLocation();
  await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
  fireEvent.click(cta());

  await waitFor(() => expect(mockFinish).toHaveBeenCalled());
  expect(signed()).toEqual([[VEHICLE_DATA, VIN, LIVE_DATA, RAW_DATA]]);
});

describe('every permission', () => {
  // Labels as the request card shows them, by permission number.
  const LABELS: [number, RegExp][] = [
    [1, /Vehicle data/],
    [2, /Lock and unlock/],
    [3, /Current location/],
    [4, /Location history/],
    [5, /Credentials/],
    [6, /Live data/],
    [7, /Raw data/],
    [8, /Approximate location/],
  ];
  const ALL = LABELS.map(([p]) => p);

  it.each(LABELS)(
    'permission %i comes off a share that has it when switched off later',
    async (permission, label) => {
      mockCreds.permissions = '11111111';
      mockVehicles = [{ ...sharedCar, permissions: grantOf(...ALL) }];
      render(<SelectVehicles />);
      expect(
        await screen.findByText('All your vehicles are already shared'),
      ).toBeVisible();

      switchOff(label);
      await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
      fireEvent.click(cta());

      await waitFor(() => expect(mockFinish).toHaveBeenCalled());
      const rest = ALL.filter((p) => p !== permission);
      expect(signed()).toEqual([rest]);
      expect((setVehiclePermissions as Mock).mock.calls[0][0].permissions).toEqual(rest);
    },
  );

  it.each(LABELS)(
    'permission %i is left out of a new share when switched off',
    async (permission, label) => {
      mockCreds.permissions = '11111111';
      mockVehicles = [newCar];
      render(<SelectVehicles />);
      fireEvent.click(await screen.findByLabelText(/2022 Toyota RAV4/));
      switchOff(label);
      fireEvent.click(cta());

      await waitFor(() => expect(mockFinish).toHaveBeenCalled());
      expect(signed()).toEqual([ALL.filter((p) => p !== permission)]);
    },
  );
});

describe('documents', () => {
  const GRANTOR = '0x1111111111111111111111111111111111111111';
  const VEHICLE_DOCS = 'dimo.document.vehicle.*';
  const RAW_FILES = 'dimo.raw.vehicle.*';
  // The car's grant document: vehicle data plus the given kinds of file.
  const shareWithFiles = (...eventTypes: string[]) => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          grantor: { address: GRANTOR },
          grantee: { address: mockClientId },
          agreements: eventTypes.map((eventType) => ({
            type: 'cloudevent',
            eventType,
            asset: sharedCar.tokenDID,
            source: GRANTOR,
          })),
        },
      }),
    })) as any;
    return {
      ...sharedCar,
      permissions: grantOf(VEHICLE_DATA),
      source: 'ipfs://grant',
      // What the list reads from that document.
      grantedFiles: eventTypes.map((eventType) => ({
        eventType,
        source: GRANTOR,
        ids: [],
        tags: [],
      })),
      documentAccess: true,
    };
  };
  // Event types in the one grant document signed.
  const signedFiles = () =>
    (generateIpfsSources as Mock).mock.calls[0][3].cloudEventAgreements?.map(
      (a: { eventType: string }) => a.eventType,
    ) ?? [];

  beforeEach(() => {
    // Vehicle data, vehicle documents and original vehicle files.
    mockCreds.permissions = '1';
    mockCreds.cloudEvent = [{ eventType: VEHICLE_DOCS }, { eventType: RAW_FILES }];
  });

  it('come off a share that has them when switched off later', async () => {
    mockVehicles = [shareWithFiles(VEHICLE_DOCS, RAW_FILES)];
    render(<SelectVehicles />);
    expect(await screen.findByText('All your vehicles are already shared')).toBeVisible();

    switchOff(/Vehicle documents/);
    expect(await screen.findByText('Removes Vehicle documents')).toBeInTheDocument();
    await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
    fireEvent.click(cta());

    await waitFor(() => expect(mockFinish).toHaveBeenCalled());
    expect(signedFiles()).toEqual([RAW_FILES]);
    expect((setVehiclePermissions as Mock).mock.calls[0][0].permissions).toEqual([
      VEHICLE_DATA,
    ]);
  });

  it('come back when asked for again and left on', async () => {
    // Shared earlier with original files only.
    mockVehicles = [{ ...shareWithFiles(RAW_FILES), documentAccess: false }];
    render(<SelectVehicles />);
    expect(
      await screen.findByText(
        'Adds Vehicle documents and Original vehicle document files',
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
    fireEvent.click(cta());

    await waitFor(() => expect(mockFinish).toHaveBeenCalled());
    expect(signedFiles()).toEqual([RAW_FILES, VEHICLE_DOCS]);
  });

  it('are left out of a new share when switched off', async () => {
    mockVehicles = [newCar];
    render(<SelectVehicles />);
    fireEvent.click(await screen.findByLabelText(/2022 Toyota RAV4/));
    switchOff(/Vehicle documents/);
    fireEvent.click(cta());

    await waitFor(() => expect(mockFinish).toHaveBeenCalled());
    expect(signedFiles()).toEqual([RAW_FILES]);
  });

  it('switching off vehicle data takes it off and keeps the documents', async () => {
    // Asked for: vehicle data and live data, plus both kinds of file.
    mockCreds.permissions = '10000100';
    mockVehicles = [
      {
        ...shareWithFiles(VEHICLE_DOCS, RAW_FILES),
        permissions: grantOf(VEHICLE_DATA, LIVE_DATA),
      },
    ];
    render(<SelectVehicles />);
    expect(await screen.findByText('All your vehicles are already shared')).toBeVisible();

    switchOff(/Vehicle data/);
    expect(await screen.findByText('Removes Vehicle data')).toBeInTheDocument();
    await waitFor(() => expect(cta()).toHaveTextContent('Update 1 vehicle'));
    fireEvent.click(cta());

    await waitFor(() => expect(mockFinish).toHaveBeenCalled());
    expect((setVehiclePermissions as Mock).mock.calls[0][0].permissions).toEqual([
      LIVE_DATA,
    ]);
    expect(signedFiles()).toEqual([VEHICLE_DOCS, RAW_FILES]);
  });
});
