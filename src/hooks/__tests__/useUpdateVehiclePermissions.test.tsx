/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { render, act } from '@testing-library/react';

jest.mock('@dimo-network/transactions', () => ({
  ENVIRONMENT: 'mock',
  Permission: { ExecuteCommands: 2, GetRawData: 7 },
  getPermissionsArray: (value: bigint) =>
    [1, 2, 3, 4, 5, 6, 7, 8].filter(
      (p) => ((value >> BigInt(p * 2)) & BigInt(3)) === BigInt(3),
    ),
}));
jest.mock('../../services', () => ({
  createPermissionsFromParams: jest.fn(),
  generateIpfsSources: jest.fn(),
  setVehiclePermissions: jest.fn(),
}));
jest.mock('../../services/permissionsService', () => ({
  generateAttachments: () => [],
}));
jest.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: '0xgrantee000000000000000000000000000000000',
    cloudEvent: { eventType: 'dimo.document.vehicle.*', tags: ['documents'] },
  }),
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

import { useUpdateVehiclePermissions } from '../useUpdateVehiclePermissions';
import {
  createPermissionsFromParams,
  generateIpfsSources,
  setVehiclePermissions,
} from '../../services';
import { Vehicle } from '../../models/vehicle';
import { clearGrantReadCache } from '../../services/vehicleDocumentAgreements';
import { VehiclePermissionsAction } from '../../types';

const DID = 'did:erc721:137:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:186612';
const COMMANDS_ONLY = (BigInt(3) << BigInt(4)).toString(); // ExecuteCommands (2)
const EXISTING_RAW = { type: 'cloudevent', eventType: 'dimo.raw.vehicle.*', asset: DID };

const originalFetch = global.fetch;
beforeEach(() => {
  clearGrantReadCache();
  (createPermissionsFromParams as jest.Mock).mockReturnValue([7]);
  (generateIpfsSources as jest.Mock).mockResolvedValue('ipfs://bafy');
  (setVehiclePermissions as jest.Mock).mockResolvedValue(undefined);
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      data: {
        grantor: { address: '0x1111111111111111111111111111111111111111' },
        grantee: { address: '0xgrantee000000000000000000000000000000000' },
        agreements: [EXISTING_RAW],
      },
    }),
  })) as any;
});
afterEach(() => {
  global.fetch = originalFetch;
});

const run = async (action: VehiclePermissionsAction) => {
  let update: ReturnType<typeof useUpdateVehiclePermissions> | undefined;
  const Probe = () => {
    update = useUpdateVehiclePermissions();
    return null;
  };
  render(<Probe />);
  const vehicle = {
    tokenId: 186612,
    tokenDID: DID,
    shared: true,
    permissions: COMMANDS_ONLY,
    source: 'ipfs://old',
  } as Vehicle;
  await act(async () => {
    await update!({ permissions: '11111111', expiration: BigInt(0), vehicle, action });
  });
  const [perms, , , opts] = (generateIpfsSources as jest.Mock).mock.calls[0];
  return {
    perms,
    eventTypes: opts.cloudEventAgreements.map((a: any) => a.eventType),
    asset: opts.asset,
  };
};

it('update keeps the current grant and adds what is requested', async () => {
  const signed = await run('update');
  expect(signed.perms).toEqual([2, 7]);
  expect(signed.eventTypes).toEqual(['dimo.raw.vehicle.*', 'dimo.document.vehicle.*']);
  expect(signed.asset).toBe(DID);
});

it('extend keeps the current grant and adds no requested files', async () => {
  const signed = await run('extend');
  expect(signed.eventTypes).toEqual(['dimo.raw.vehicle.*']);
});

it('stop sharing signs no files and never reads the old grant', async () => {
  const signed = await run('revoke');
  expect(signed.eventTypes).toEqual([]);
  expect(global.fetch).not.toHaveBeenCalled();
});

it("sends nothing when the current grant can't be read", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('gateway down')) as any;
  await expect(run('extend')).rejects.toThrow("Couldn't read the current sharing terms");
  expect(setVehiclePermissions).not.toHaveBeenCalled();
});
