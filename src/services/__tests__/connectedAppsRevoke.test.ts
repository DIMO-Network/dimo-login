import { Permission } from '@dimo-network/transactions';

import { revokeAppAccess } from '../connectedAppsRevoke';
import {
  generateAccountIpfsSource,
  generateIpfsSources,
  setAccountPermissions,
  setVehiclePermissionsBatch,
} from '../turnkeyService';
import { fetchAccountGrants } from '../grantsService';
import type { AppAccess } from '../../hooks/useConnectedApps';

vi.mock('../turnkeyService', () => ({
  VEHICLE_PERMISSIONS_BATCH_LIMIT: 24,
  generateIpfsSources: vi.fn(),
  generateAccountIpfsSource: vi.fn(),
  setVehiclePermissionsBatch: vi.fn(),
  setAccountPermissions: vi.fn(),
}));
vi.mock('../grantsService', () => ({ fetchAccountGrants: vi.fn() }));

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
});

it('ends every vehicle grant to the app, 24 to a user operation', async () => {
  await revokeAppAccess(OWNER, app(30));

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
  await revokeAppAccess(OWNER, app(1));
  expect(setVehiclePermissionsBatch).toHaveBeenCalledTimes(1);
});

it('ends the account grant too, and checks that it ended', async () => {
  await revokeAppAccess(OWNER, app(1, true));

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
  expect(fetchAccountGrants).toHaveBeenCalledWith(OWNER);
});

it('fails when the account grant is still in force afterwards', async () => {
  vi.mocked(fetchAccountGrants).mockResolvedValue([
    { ...grant, grantee: G.toUpperCase().replace('0X', '0x') },
  ]);
  await expect(revokeAppAccess(OWNER, app(1, true))).rejects.toThrow('still in force');
  // The vehicles were already done.
  expect(setVehiclePermissionsBatch).toHaveBeenCalledTimes(1);
});

it('fails when the account grant can’t be changed', async () => {
  vi.mocked(setAccountPermissions).mockRejectedValue(new Error('reverted'));
  await expect(revokeAppAccess(OWNER, app(0, true))).rejects.toThrow('reverted');
  expect(setVehiclePermissionsBatch).not.toHaveBeenCalled();
});

it('fails when a vehicle batch fails, before touching the account grant', async () => {
  vi.mocked(setVehiclePermissionsBatch).mockRejectedValue(new Error('bundler'));
  await expect(revokeAppAccess(OWNER, app(2, true))).rejects.toThrow('bundler');
  expect(setAccountPermissions).not.toHaveBeenCalled();
});
