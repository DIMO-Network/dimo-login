import type { Mock } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { useShareAccounts } from '../useShareAccounts';
import { generateAccountIpfsSource, setAccountPermissions } from '../../services';

// vi.mock calls are hoisted above these imports.

// NOTE: this repo pins @testing-library/react@13 (no renderHook export) and does
// not have @testing-library/react-hooks, so we exercise the hook through a probe
// component — the same pattern used by the existing context tests.

// We only need the Permission enum value the hook reads (GetRawData = 7).
vi.mock('@dimo-network/transactions', () => ({
  ENVIRONMENT: 'mock',
  Permission: { GetRawData: 7 },
}));
vi.mock('../../services', () => ({
  generateAccountIpfsSource: vi.fn(),
  setAccountPermissions: vi.fn(),
}));
vi.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: '0xgrantee000000000000000000000000000000000',
    expirationDate: BigInt(Math.floor(Date.now() / 1000) + 3600),
    permissions: undefined,
    permissionTemplateId: '1',
  }),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({ validateSession: vi.fn().mockResolvedValue(true) }),
}));
// authUtils pulls in turnkeyService and the Turnkey SDKs; we only need the
// error constant.
vi.mock('../../utils/authUtils', () => ({
  INVALID_SESSION_ERROR: 'Invalid session',
}));

// (Re)apply resolved values before each test.
beforeEach(() => {
  (generateAccountIpfsSource as Mock).mockResolvedValue('ipfs://bafyfake');
  (setAccountPermissions as Mock).mockResolvedValue(undefined);
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
  const arg = (setAccountPermissions as Mock).mock.calls[0][0];
  expect(arg.grantee).toBe('0xgrantee000000000000000000000000000000000');
  expect(arg.templateId).toBe(0n);
  expect(arg.source).toBe('ipfs://bafyfake');
  expect(arg.permissions).toEqual([7]); // Permission.GetRawData
});
