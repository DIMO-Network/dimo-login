/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import type { Mock } from 'vitest';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';

const GRANTOR = '0x1111111111111111111111111111111111111111';
const GRANTEE = '0x2222222222222222222222222222222222222222';
const VEHICLE_DOCS = { eventType: 'dimo.document.vehicle.*', tags: [] };

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({ user: { smartContractAddress: GRANTOR } }),
}));
vi.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({ clientId: GRANTEE, cloudEvent: VEHICLE_DOCS }),
}));
vi.mock('../../services/vehicleService', () => ({
  fetchVehiclesWithTransformation: vi.fn(),
}));
vi.mock('../../services/vehicleDocumentAgreements', async () => ({
  ...(await vi.importActual<object>('../../services/vehicleDocumentAgreements')),
  readGrantAgreements: vi.fn(),
}));

import { useFetchVehicles } from '../useFetchVehicles';
import { fetchVehiclesWithTransformation } from '../../services/vehicleService';
import { readGrantAgreements } from '../../services/vehicleDocumentAgreements';
import { Vehicle } from '../../models/vehicle';

const shared = {
  tokenId: 1,
  tokenDID: 'did:erc721:137:0xvehicles:1',
  shared: true,
  permissions: '0',
  source: 'ipfs://grant',
} as Vehicle;

const load = async () => {
  let hook: ReturnType<typeof useFetchVehicles> | undefined;
  const Probe = () => {
    hook = useFetchVehicles();
    return null;
  };
  render(<Probe />);
  await act(async () => {
    await hook!.fetchVehicles();
  });
  return () => hook!;
};

beforeEach(() => {
  vi.clearAllMocks();
  (fetchVehiclesWithTransformation as Mock).mockResolvedValue({
    compatibleVehicles: [shared],
    incompatibleVehicles: [],
    endCursor: '',
    startCursor: '',
    hasNextPage: false,
    hasPreviousPage: false,
  });
});

it('reads each grant once and keeps what it shares', async () => {
  const granted = [{ ...VEHICLE_DOCS, source: GRANTOR, ids: [] }];
  (readGrantAgreements as Mock).mockResolvedValue(granted);
  const hook = await load();

  await waitFor(() => expect(hook().vehicles[0].checkingAccess).toBe(false));
  expect(readGrantAgreements).toHaveBeenCalledTimes(1);
  expect(hook().vehicles[0]).toMatchObject({
    documentAccess: true,
    grantedFiles: granted,
  });
});

it("reads a grant that can't be read only once, and guesses nothing", async () => {
  (readGrantAgreements as Mock).mockRejectedValue(new Error('gateway down'));
  const hook = await load();

  await waitFor(() => expect(hook().vehicles[0].checkingAccess).toBe(false));
  expect(readGrantAgreements).toHaveBeenCalledTimes(1);
  expect(hook().vehicles[0].documentAccess).toBeUndefined();
  expect(hook().vehicles[0].grantedFiles).toBeUndefined();
});
