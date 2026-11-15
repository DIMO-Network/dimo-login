/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';

vi.mock('../../services/grantsService', () => ({
  fetchConnectedAppGrants: vi.fn(),
  fetchLicenseAliases: vi.fn(),
}));
const OWNER = '0x00000000000000000000000000000000000000aa';
const CURRENT_APP = '0x1111111111111111111111111111111111111111';
vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({
    user: { email: 'jun@example.com', smartContractAddress: OWNER },
  }),
}));
vi.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({ clientId: CURRENT_APP }),
}));

import {
  fetchConnectedAppGrants,
  fetchLicenseAliases,
  type SacdGrant,
} from '../../services/grantsService';
import { groupGrantsByApp, useConnectedApps } from '../useConnectedApps';

const NOW = Date.parse('2027-01-01T00:00:00Z');
const G1 = '0x00000000000000000000000000000000000000b1';
const G2 = '0x00000000000000000000000000000000000000b2';
const grant = (grantee: string, expiresAt: string): SacdGrant => ({
  grantee,
  permissions: '0x3ffc',
  expiresAt,
  source: 'ipfs://x',
});
const vehicle = (tokenId: number, grants: SacdGrant[]) => ({
  tokenId,
  tokenDID: `did:erc721:137:0xv:${tokenId}`,
  name: `Vehicle ${tokenId}`,
  grants,
});

describe('groupGrantsByApp', () => {
  it('groups vehicles and documents by app, whatever the address case', () => {
    const apps = groupGrantsByApp(
      {
        vehicles: [
          vehicle(1, [
            grant(G1, '2028-01-01T00:00:00Z'),
            grant(G2, '2029-01-01T00:00:00Z'),
          ]),
          vehicle(2, [
            grant('0x00000000000000000000000000000000000000B1', '2030-01-01T00:00:00Z'),
          ]),
        ],
        accountGrants: [grant(G2, '2031-01-01T00:00:00Z')],
      },
      NOW,
    );
    expect(apps.map((a) => a.grantee)).toEqual([G1, G2]);
    expect(apps[0].vehicles.map((v) => v.tokenId)).toEqual([1, 2]);
    expect(apps[0].documents).toBeNull();
    // Until the last of its grants ends.
    expect(apps[0].expiresAt).toBe('2030-01-01T00:00:00Z');
    expect(apps[1].vehicles.map((v) => v.tokenId)).toEqual([1]);
    expect(apps[1].documents?.expiresAt).toBe('2031-01-01T00:00:00Z');
    expect(apps[1].expiresAt).toBe('2031-01-01T00:00:00Z');
  });

  it('leaves out grants that have ended, and an app with nothing left', () => {
    const apps = groupGrantsByApp(
      {
        vehicles: [
          vehicle(1, [
            grant(G1, '2026-06-01T00:00:00Z'),
            grant(G2, '2028-01-01T00:00:00Z'),
          ]),
        ],
        accountGrants: [grant(G2, '1970-01-01T00:00:00Z')],
      },
      NOW,
    );
    expect(apps.map((a) => a.grantee)).toEqual([G2]);
    expect(apps[0].documents).toBeNull();
  });

  it('ignores a grant whose end it can’t read', () => {
    expect(
      groupGrantsByApp(
        { vehicles: [vehicle(1, [grant(G1, 'soon')])], accountGrants: [] },
        NOW,
      ),
    ).toEqual([]);
  });
});

describe('useConnectedApps', () => {
  const OTHER_APP = '0x2222222222222222222222222222222222222222';
  let hook!: ReturnType<typeof useConnectedApps>;
  const Probe = () => {
    hook = useConnectedApps();
    return null;
  };

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(fetchConnectedAppGrants).mockResolvedValue({
      vehicles: [vehicle(1, [grant(G1, '2999-01-01T00:00:00Z')])],
      accountGrants: [grant(G2, '2999-01-01T00:00:00Z')],
    });
    vi.mocked(fetchLicenseAliases).mockResolvedValue(new Map([[G1, 'Acme']]));
  });

  it('loads the account’s grants and names each app it can', async () => {
    render(<Probe />);
    expect(hook.grants).toBe('loading');
    await waitFor(() => expect(Array.isArray(hook.grants)).toBe(true));
    expect(fetchConnectedAppGrants).toHaveBeenCalledWith(OWNER);
    expect(hook.grants).toHaveLength(2);
    expect(hook.nameOf(G1)).toBe('Acme');
    expect(hook.nameOf(G2)).toBeNull();
  });

  it('lists the other apps signed in as this account on this browser', async () => {
    const user = JSON.stringify({ email: 'Jun@example.com' });
    localStorage.setItem(`user_data_${OTHER_APP}`, user);
    localStorage.setItem(`user_data_${CURRENT_APP}`, user);
    localStorage.setItem(
      'user_data_0x3333333333333333333333333333333333333333',
      JSON.stringify({ email: 'someone@else.co' }),
    );
    render(<Probe />);
    await waitFor(() => expect(Array.isArray(hook.grants)).toBe(true));
    expect(hook.browserApps).toEqual([OTHER_APP]);
    // One alias lookup for both sections.
    expect(fetchLicenseAliases).toHaveBeenCalledTimes(1);
    expect(fetchLicenseAliases).toHaveBeenCalledWith(
      expect.arrayContaining([G1, G2, OTHER_APP]),
    );
  });

  it('signs an app out here and drops it from the list', async () => {
    localStorage.setItem(
      `user_data_${OTHER_APP}`,
      JSON.stringify({ email: 'jun@example.com' }),
    );
    render(<Probe />);
    await waitFor(() => expect(hook.browserApps).toEqual([OTHER_APP]));
    act(() => hook.signOutHere(OTHER_APP));
    expect(hook.browserApps).toEqual([]);
    expect(localStorage.getItem(`user_data_${OTHER_APP}`)).toBeNull();
  });

  it('reports a failed load, and loads again on reload', async () => {
    vi.mocked(fetchConnectedAppGrants).mockRejectedValueOnce(new Error('down'));
    render(<Probe />);
    await waitFor(() => expect(hook.grants).toBe('error'));
    await act(async () => {
      await hook.reload();
    });
    expect(hook.grants).toHaveLength(2);
  });
});
