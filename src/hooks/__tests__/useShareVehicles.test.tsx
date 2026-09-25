/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { render, act } from '@testing-library/react';

// Same conventions as useShareAccounts.test: mock the ESM transactions package
// and the turnkey-backed services, and drive the hook through a probe component.
jest.mock('@dimo-network/transactions', () => ({
  ENVIRONMENT: 'mock',
  Permission: { ExecuteCommands: 2, GetRawData: 7 },
  // Same 2-bit encoding as the SDK: permission p sits at bits 2p..2p+1.
  getPermissionsArray: (value: bigint) =>
    [1, 2, 3, 4, 5, 6, 7, 8].filter(
      (p) => ((value >> BigInt(p * 2)) & BigInt(3)) === BigInt(3),
    ),
}));
jest.mock('../../services', () => ({
  createPermissionsFromParams: jest.fn(),
  generateIpfsSources: jest.fn(),
  setVehiclePermissions: jest.fn(),
  setVehiclePermissionsBulk: jest.fn(),
}));
jest.mock('../../services/turnkeyService', () => ({
  setVehiclePermissionsBatch: jest.fn(),
  VEHICLE_PERMISSIONS_BATCH_LIMIT: 24,
}));
jest.mock('../../services/permissionsService', () => ({
  generateAttachments: () => [],
}));
const mockCredentials: Record<string, unknown> = {};
jest.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => mockCredentials,
}));
jest.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({
    validateSession: jest.fn().mockResolvedValue(true),
    user: { smartContractAddress: '0x1111111111111111111111111111111111111111' },
  }),
}));
jest.mock('../../utils/authUtils', () => ({
  INVALID_SESSION_ERROR: 'Invalid session',
}));

import { useShareVehicles } from '../useShareVehicles';
import {
  createPermissionsFromParams,
  generateIpfsSources,
  setVehiclePermissions,
  setVehiclePermissionsBulk,
} from '../../services';
import { setVehiclePermissionsBatch } from '../../services/turnkeyService';
import { Vehicle } from '../../models/vehicle';
import { clearGrantReadCache } from '../../services/vehicleDocumentAgreements';

const vehicle = (tokenId: number) =>
  ({
    tokenId,
    tokenDID: `did:erc721:137:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:${tokenId}`,
  }) as Vehicle;

const CLOUD_EVENT = { eventType: 'dimo.document.vehicle.*', tags: ['documents'] };
const GRANTOR = '0x1111111111111111111111111111111111111111';
const COMMANDS_ONLY = (BigInt(3) << BigInt(4)).toString(); // ExecuteCommands (2)

// A vehicle already shared with this app, whose grant document is on IPFS.
const sharedVehicle = (tokenId: number) =>
  ({
    ...vehicle(tokenId),
    shared: true,
    permissions: COMMANDS_ONLY,
    source: 'ipfs://old',
  }) as Vehicle;

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  clearGrantReadCache();
  Object.assign(mockCredentials, {
    clientId: '0xgrantee000000000000000000000000000000000',
    expirationDate: BigInt(2000000000),
    permissions: '11111111',
    permissionTemplateId: undefined,
    region: undefined,
    cloudEvent: undefined,
  });
  (createPermissionsFromParams as jest.Mock).mockReturnValue([7]);
  (generateIpfsSources as jest.Mock).mockImplementation(
    async (_p, _c, _e, opts) => `ipfs://${opts.asset ?? 'bulk'}`,
  );
  (setVehiclePermissions as jest.Mock).mockResolvedValue(undefined);
  (setVehiclePermissionsBulk as jest.Mock).mockResolvedValue(undefined);
  (setVehiclePermissionsBatch as jest.Mock).mockResolvedValue(undefined);
});

const share = async (vehicles: Vehicle[]) => {
  let run: ((v: Vehicle[]) => Promise<void>) | undefined;
  const Probe = () => {
    run = useShareVehicles();
    return null;
  };
  render(<Probe />);
  await act(async () => {
    await run!(vehicles);
  });
};

it('shares several vehicles in one bulk grant when no files are requested', async () => {
  await share([vehicle(1), vehicle(2)]);

  expect(setVehiclePermissions).not.toHaveBeenCalled();
  expect(setVehiclePermissionsBulk).toHaveBeenCalledTimes(1);
  expect((generateIpfsSources as jest.Mock).mock.calls[0][3].asset).toBeUndefined();
});

it('signs a document per vehicle and sends them in one batch when files are requested', async () => {
  mockCredentials.cloudEvent = CLOUD_EVENT;
  await share([vehicle(1), vehicle(2)]);

  expect(setVehiclePermissionsBulk).not.toHaveBeenCalled();
  expect(setVehiclePermissions).not.toHaveBeenCalled();
  expect(setVehiclePermissionsBatch).toHaveBeenCalledTimes(1);

  const [first, second] = (generateIpfsSources as jest.Mock).mock.calls.map((c) => c[3]);
  expect(first.asset).toBe(vehicle(1).tokenDID);
  expect(second.asset).toBe(vehicle(2).tokenDID);
  expect(first.cloudEventAgreements).toEqual([
    { ...CLOUD_EVENT, ids: [], source: GRANTOR },
  ]);

  const grants = (setVehiclePermissionsBatch as jest.Mock).mock.calls[0][0];
  expect(grants.map((g: any) => g.tokenId)).toEqual([BigInt(1), BigInt(2)]);
  expect(grants[1].source).toBe(`ipfs://${vehicle(2).tokenDID}`);
});

it('splits more than 24 vehicles into batches', async () => {
  mockCredentials.cloudEvent = CLOUD_EVENT;
  await share(Array.from({ length: 30 }, (_, i) => vehicle(i + 1)));

  const batches = (setVehiclePermissionsBatch as jest.Mock).mock.calls.map(
    (c) => c[0].length,
  );
  expect(batches).toEqual([24, 6]);
});

it('sends nothing if any document fails to sign', async () => {
  mockCredentials.cloudEvent = CLOUD_EVENT;
  (generateIpfsSources as jest.Mock).mockImplementation(async (_p, _c, _e, opts) => {
    if (opts.asset === vehicle(2).tokenDID) throw new Error('upload failed');
    return 'ipfs://ok';
  });

  await expect(share([vehicle(1), vehicle(2)])).rejects.toThrow('upload failed');
  expect(setVehiclePermissionsBatch).not.toHaveBeenCalled();
});

it('refuses to grant files for a vehicle without a DID, before signing anything', async () => {
  mockCredentials.cloudEvent = CLOUD_EVENT;
  const noDid = { tokenId: 9, tokenDID: '' } as Vehicle;

  await expect(share([vehicle(1), noDid])).rejects.toThrow('has no DID');
  expect(generateIpfsSources).not.toHaveBeenCalled();
  expect(setVehiclePermissionsBatch).not.toHaveBeenCalled();
});

it('names the vehicle DID for a single-vehicle share', async () => {
  await share([vehicle(1)]);

  expect(setVehiclePermissions).toHaveBeenCalledTimes(1);
  expect((generateIpfsSources as jest.Mock).mock.calls[0][3].asset).toBe(
    vehicle(1).tokenDID,
  );
});

it('updates a shared vehicle without dropping what its grant already has', async () => {
  mockCredentials.cloudEvent = CLOUD_EVENT;
  const oldDid = vehicle(5).tokenDID;
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      data: {
        agreements: [
          {
            type: 'cloudevent',
            eventType: 'dimo.raw.vehicle.*',
            asset: oldDid,
            source: GRANTOR,
          },
        ],
      },
    }),
  })) as any;

  await share([sharedVehicle(5)]);

  const grant = (setVehiclePermissions as jest.Mock).mock.calls[0][0];
  expect(grant.permissions).toEqual([2, 7]); // kept commands, added raw data
  const signed = (generateIpfsSources as jest.Mock).mock.calls[0];
  expect(signed[0]).toEqual([2, 7]);
  expect(signed[3].cloudEventAgreements.map((a: any) => a.eventType)).toEqual([
    'dimo.raw.vehicle.*',
    'dimo.document.vehicle.*',
  ]);
});

it("sends nothing when a shared vehicle's current grant can't be read", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('gateway down')) as any;

  await expect(share([vehicle(1), sharedVehicle(5)])).rejects.toThrow(
    "Couldn't read the current sharing terms",
  );
  expect(setVehiclePermissionsBatch).not.toHaveBeenCalled();
  expect(setVehiclePermissionsBulk).not.toHaveBeenCalled();
  // Every current grant is read before anything is signed.
  expect(generateIpfsSources).not.toHaveBeenCalled();
});

it("keeps a shared vehicle's later expiry when the app asks for less", async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ data: { agreements: [] } }),
  })) as any;
  const vehicleWithLongGrant = {
    ...sharedVehicle(5),
    grantExpiresAt: '2099-01-01T00:00:00Z',
  } as Vehicle;

  await share([vehicleWithLongGrant]);

  const grant = (setVehiclePermissions as jest.Mock).mock.calls[0][0];
  expect(grant.expiration).toBe(BigInt(Date.parse('2099-01-01T00:00:00Z') / 1000));
});
