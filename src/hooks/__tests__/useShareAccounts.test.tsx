import React from 'react';
import { render, act } from '@testing-library/react';

// NOTE: this repo pins @testing-library/react@13 (no renderHook export) and does
// not have @testing-library/react-hooks, so we exercise the hook through a probe
// component — the same pattern used by the existing context tests.

// @dimo-network/transactions ships ESM that CRA's jest does not transform; the
// repo convention (see vehicleService.test) is to mock it. We only need the
// Permission enum value the hook reads (GetRawData = 7).
jest.mock('@dimo-network/transactions', () => ({
  ENVIRONMENT: 'mock',
  Permission: { GetRawData: 7 },
}));
jest.mock('../../services', () => ({
  generateAccountIpfsSource: jest.fn(),
  setAccountPermissions: jest.fn(),
}));
jest.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: '0xgrantee000000000000000000000000000000000',
    expirationDate: BigInt(Math.floor(Date.now() / 1000) + 3600),
    permissions: undefined,
    permissionTemplateId: '1',
  }),
}));
jest.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({ validateSession: jest.fn().mockResolvedValue(true) }),
}));
// authUtils transitively pulls turnkeyService -> @turnkey/http (an ESM/peculiar
// chain CRA jest can't resolve). We only need the error constant.
jest.mock('../../utils/authUtils', () => ({
  INVALID_SESSION_ERROR: 'Invalid session',
}));

import { useShareAccounts } from '../useShareAccounts';
import { generateAccountIpfsSource, setAccountPermissions } from '../../services';

// CRA sets resetMocks:true, which strips implementations set in the mock factory
// before each test, so (re)apply resolved values here.
beforeEach(() => {
  (generateAccountIpfsSource as jest.Mock).mockResolvedValue('ipfs://bafyfake');
  (setAccountPermissions as jest.Mock).mockResolvedValue(undefined);
});

const Probe: React.FC<{ onReady: (run: () => Promise<void>) => void }> = ({
  onReady,
}) => {
  const run = useShareAccounts();
  onReady(run);
  return null;
};

it('calls setAccountPermissions with GetRawData + templateId 0n + ipfs source', async () => {
  let run: (() => Promise<void>) | undefined;
  render(<Probe onReady={(r) => (run = r)} />);

  await act(async () => {
    await run!();
  });

  expect(setAccountPermissions).toHaveBeenCalledTimes(1);
  const arg = (setAccountPermissions as jest.Mock).mock.calls[0][0];
  expect(arg.grantee).toBe('0xgrantee000000000000000000000000000000000');
  expect(arg.templateId).toBe(0n);
  expect(arg.source).toBe('ipfs://bafyfake');
  expect(arg.permissions).toEqual([7]); // Permission.GetRawData
});
