/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { render, act } from '@testing-library/react';

jest.mock('@dimo-network/transactions', () => ({
  ENVIRONMENT: 'mock',
  Permission: { GetRawData: 7 },
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
  useAuthContext: () => ({ validateSession: jest.fn().mockResolvedValue(true) }),
}));
jest.mock('../../utils/authUtils', () => ({
  INVALID_SESSION_ERROR: 'Invalid session',
}));

import { useUpdateVehiclePermissions } from '../useUpdateVehiclePermissions';
import { generateIpfsSources, setVehiclePermissions } from '../../services';
import { Vehicle } from '../../models/vehicle';
import { VehiclePermissionsAction } from '../../types';

const DID = 'did:erc721:137:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:186612';

beforeEach(() => {
  (generateIpfsSources as jest.Mock).mockResolvedValue('ipfs://bafy');
  (setVehiclePermissions as jest.Mock).mockResolvedValue(undefined);
});

const signedAgreements = async (
  action: VehiclePermissionsAction,
  documentAccess?: boolean,
) => {
  let run: ReturnType<typeof useUpdateVehiclePermissions> | undefined;
  const Probe = () => {
    run = useUpdateVehiclePermissions();
    return null;
  };
  render(<Probe />);
  const vehicle = { tokenId: 186612, tokenDID: DID, documentAccess } as Vehicle;
  await act(async () => {
    await run!({ permissions: '11111111', expiration: BigInt(0), vehicle, action });
  });
  const opts = (generateIpfsSources as jest.Mock).mock.calls[0][3];
  expect(opts.asset).toBe(DID);
  return opts.cloudEventAgreements;
};

it('adds the requested files on update', async () => {
  expect(await signedAgreements('update')).toHaveLength(1);
});

it('keeps files on extend only when the grant already has them', async () => {
  expect(await signedAgreements('extend', true)).toHaveLength(1);
});

it('does not add files on extend when the user was never shown them', async () => {
  expect(await signedAgreements('extend', undefined)).toEqual([]);
});

it('never signs files when revoking', async () => {
  expect(await signedAgreements('revoke', true)).toEqual([]);
});
