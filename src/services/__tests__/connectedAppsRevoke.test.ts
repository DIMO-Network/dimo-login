import { Permission } from '@dimo-network/transactions';

import { revokeAppAccess, waitForRevocation } from '../connectedAppsRevoke';
import {
  generateAccountIpfsSource,
  generateIpfsSources,
  setAccountPermissions,
  setVehiclePermissionsBatch,
} from '../turnkeyService';
import { fetchAccountGrants, fetchVehiclesStillGranted } from '../grantsService';
import type { AppAccess } from '../../hooks/useConnectedApps';

vi.mock('../turnkeyService', () => ({
  VEHICLE_PERMISSIONS_BATCH_LIMIT: 24,
  generateIpfsSources: vi.fn(),
  generateAccountIpfsSource: vi.fn(),
  setVehiclePermissionsBatch: vi.fn(),
  setAccountPermissions: vi.fn(),
}));
vi.mock('../grantsService', () => ({
  fetchAccountGrants: vi.fn(),
  fetchVehiclesStillGranted: vi.fn(),
}));

const OWNER = '0x00000000000000000000000000000000000000aa';
const G = '0x00000000000000000000000000000000000000b1';
const ZERO = BigInt(0);
// GetNonLocationHistory (bits 2–3) and GetCurrentLocation (bits 6–7).
const PERMISSIONS = `0x${((BigInt(3) << BigInt(2)) | (BigInt(3) << BigInt(6))).toString(16)}`;
const grant = {
  grantee: G,
  permissions: PERMISSIONS,
  expiresAt: '2999-01-01T00:00:00Z',
  source: 'ipfs://old',
};

const app = (vehicleCount: number, documents = false): AppAccess => ({
  grantee: G,
  vehicles: Array.from({ length: vehicleCount }, (_, i) => ({
    tokenId: i + 1,
    tokenDID: `did:erc721:137:0xv:${i + 1}`,
    name: `Vehicle ${i + 1}`,
    grant,
  })),
  documents: documents ? grant : null,
  expiresAt: grant.expiresAt,
});

beforeEach(() => {
  vi.mocked(generateIpfsSources).mockImplementation(
    async (_p, _g, _e, options) => `ipfs://${options?.asset}`,
  );
  vi.mocked(generateAccountIpfsSource).mockResolvedValue('ipfs://account');
  vi.mocked(setVehiclePermissionsBatch).mockResolvedValue(undefined);
  vi.mocked(setAccountPermissions).mockResolvedValue(undefined);
  vi.mocked(fetchAccountGrants).mockResolvedValue([]);
  vi.mocked(fetchVehiclesStillGranted).mockResolvedValue([]);
});

it('ends every vehicle grant to the app, 24 to a user operation', async () => {
  await revokeAppAccess(app(30));

  expect(generateIpfsSources).toHaveBeenCalledTimes(30);
  expect(generateIpfsSources).toHaveBeenCalledWith(
    [Permission.GetNonLocationHistory, Permission.GetCurrentLocation],
    G,
    ZERO,
    { asset: 'did:erc721:137:0xv:7' },
  );
  const batches = vi
    .mocked(setVehiclePermissionsBatch)
    .mock.calls.map(([grants]) => grants);
  expect(batches.map((b) => b.length)).toEqual([24, 6]);
  for (const entry of batches.flat()) {
    expect(entry).toMatchObject({ grantee: G, expiration: ZERO });
    expect(entry.source).toBe(`ipfs://did:erc721:137:0xv:${entry.tokenId}`);
  }
  expect(batches.flat().map((e) => Number(e.tokenId))).toEqual(
    Array.from({ length: 30 }, (_, i) => i + 1),
  );
  expect(setAccountPermissions).not.toHaveBeenCalled();
});

it('sends one user operation for one vehicle', async () => {
  await revokeAppAccess(app(1));
  expect(setVehiclePermissionsBatch).toHaveBeenCalledTimes(1);
});

it('ends the account grant too, and leaves checking to waitForRevocation', async () => {
  await revokeAppAccess(app(1, true));

  expect(generateAccountIpfsSource).toHaveBeenCalledWith(
    [Permission.GetNonLocationHistory, Permission.GetCurrentLocation],
    G,
    ZERO,
  );
  expect(setAccountPermissions).toHaveBeenCalledWith({
    grantee: G,
    permissions: [Permission.GetNonLocationHistory, Permission.GetCurrentLocation],
    expiration: ZERO,
    templateId: ZERO,
    source: 'ipfs://account',
  });
  expect(fetchAccountGrants).not.toHaveBeenCalled();
  expect(fetchVehiclesStillGranted).not.toHaveBeenCalled();
});

it('fails when the account grant can’t be changed', async () => {
  vi.mocked(setAccountPermissions).mockRejectedValue(new Error('reverted'));
  await expect(revokeAppAccess(app(0, true))).rejects.toThrow('reverted');
  expect(setVehiclePermissionsBatch).not.toHaveBeenCalled();
});

it('fails when a vehicle batch fails, before touching the account grant', async () => {
  vi.mocked(setVehiclePermissionsBatch).mockRejectedValue(new Error('bundler'));
  await expect(revokeAppAccess(app(2, true))).rejects.toThrow('bundler');
  expect(setAccountPermissions).not.toHaveBeenCalled();
});

describe('waitForRevocation', () => {
  const inForce = { ...grant, grantee: G.toUpperCase().replace('0X', '0x') };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Runs it to the end on fake time, and says how long it took. */
  const run = async (access: AppAccess) => {
    const started = Date.now();
    const done = waitForRevocation(OWNER, access);
    await vi.runAllTimersAsync();
    return { agreed: await done, waited: Date.now() - started };
  };

  it('is done as soon as the index agrees, here on the third look', async () => {
    vi.mocked(fetchVehiclesStillGranted)
      .mockResolvedValueOnce([1, 2])
      .mockResolvedValueOnce([2])
      .mockResolvedValue([]);
    vi.mocked(fetchAccountGrants)
      .mockResolvedValueOnce([inForce])
      .mockResolvedValueOnce([inForce])
      .mockResolvedValue([]);

    const { agreed, waited } = await run(app(2, true));

    expect(agreed).toBe(true);
    expect(waited).toBe(4_000);
    expect(fetchVehiclesStillGranted).toHaveBeenCalledTimes(3);
    expect(fetchVehiclesStillGranted).toHaveBeenCalledWith([1, 2], G);
    expect(fetchAccountGrants).toHaveBeenCalledWith(OWNER);
  });

  it('gives up after a minute when the index never agrees, without saying it failed', async () => {
    vi.mocked(fetchAccountGrants).mockResolvedValue([inForce]);
    const { agreed, waited } = await run(app(0, true));
    expect(agreed).toBe(false);
    expect(waited).toBe(60_000);
    // Every 2 seconds from the start: 0 s, 2 s, … 60 s.
    expect(fetchAccountGrants).toHaveBeenCalledTimes(31);
  });

  it('counts a read that fails as not yet', async () => {
    vi.mocked(fetchVehiclesStillGranted)
      .mockRejectedValueOnce(new Error('identity-api down'))
      .mockResolvedValue([]);
    const { agreed, waited } = await run(app(1));
    expect(agreed).toBe(true);
    expect(waited).toBe(2_000);
  });

  it('ignores a grant that has ended', async () => {
    vi.mocked(fetchAccountGrants).mockResolvedValue([
      { ...grant, expiresAt: '1970-01-01T00:00:00Z' },
    ]);
    const { agreed } = await run(app(0, true));
    expect(agreed).toBe(true);
  });

  it('stops looking once told to, and says it isn’t done', async () => {
    vi.mocked(fetchAccountGrants).mockResolvedValue([inForce]);
    const leaving = new AbortController();
    const done = waitForRevocation(OWNER, app(0, true), leaving.signal);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(fetchAccountGrants).toHaveBeenCalledTimes(2);
    leaving.abort();
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBe(false);
    expect(fetchAccountGrants).toHaveBeenCalledTimes(2);
  });

  it('doesn’t look at all when told to stop first', async () => {
    const leaving = new AbortController();
    leaving.abort();
    await expect(waitForRevocation(OWNER, app(1), leaving.signal)).resolves.toBe(false);
    expect(fetchVehiclesStillGranted).not.toHaveBeenCalled();
  });

  it('reads only what the app had', async () => {
    await run(app(1));
    expect(fetchAccountGrants).not.toHaveBeenCalled();
    await run(app(0, true));
    expect(fetchVehiclesStillGranted).toHaveBeenCalledTimes(1);
  });
});
