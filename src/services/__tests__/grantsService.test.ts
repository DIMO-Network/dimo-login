import type { Mock } from 'vitest';
import {
  fetchAccountGrants,
  fetchConnectedAppGrants,
  fetchLicenseAliases,
  fetchVehiclesStillGranted,
} from '../grantsService';
import { queryIdentity } from '../identityGraphql';

vi.mock('../identityGraphql', () => ({ queryIdentity: vi.fn() }));

describe('connected apps', () => {
  const mockQuery = queryIdentity as Mock;
  const OWNER = '0x00000000000000000000000000000000000000aa';
  const grant = (grantee: string, expiresAt = '2030-01-01T00:00:00Z') => ({
    grantee,
    permissions: '0x3ffc',
    expiresAt,
    source: 'ipfs://x',
  });
  const page = <T>(nodes: T[], endCursor: string | null = null) => ({
    nodes,
    pageInfo: { hasNextPage: endCursor !== null, endCursor },
  });
  const vehicle = (tokenId: number, grants: ReturnType<typeof page>) => ({
    tokenId,
    tokenDID: `did:erc721:137:0xv:${tokenId}`,
    definition: { make: 'Tesla', model: 'Model 3', year: 2021 },
    sacds: grants,
  });

  beforeEach(() => mockQuery.mockReset());

  it('pages the vehicles, each vehicle’s grants and the account’s grants', async () => {
    mockQuery
      // First page: two vehicles (the second has more grants), the account's first grants.
      .mockResolvedValueOnce({
        data: {
          vehicles: page(
            [vehicle(1, page([grant('0xg1')])), vehicle(2, page([grant('0xg1')], 'v2c'))],
            'vc1',
          ),
          account: { sacds: page([grant('0xg2')], 'ac1') },
        },
        errors: [],
      })
      // Second page of vehicles and of account grants.
      .mockResolvedValueOnce({
        data: {
          vehicles: page([vehicle(3, page([]))]),
          account: { sacds: page([grant('0xg3')]) },
        },
        errors: [],
      })
      // The rest of vehicle 2's grants.
      .mockResolvedValueOnce({
        data: { vehicle: { sacds: page([grant('0xg4')]) } },
        errors: [],
      });

    const result = await fetchConnectedAppGrants(OWNER);

    expect(result.vehicles.map((v) => v.tokenId)).toEqual([1, 2, 3]);
    expect(result.vehicles[1].grants.map((g) => g.grantee)).toEqual(['0xg1', '0xg4']);
    expect(result.vehicles[0].name).toBe('2021 Tesla Model 3');
    expect(result.accountGrants.map((g) => g.grantee)).toEqual(['0xg2', '0xg3']);

    const [first, second, third] = mockQuery.mock.calls;
    expect(first[0]).toMatch(/sacds\(first: 50/);
    expect(first[1]).toEqual({
      owner: OWNER,
      vehicles: true,
      vehiclesAfter: null,
      account: true,
      accountAfter: null,
    });
    expect(second[1]).toEqual({
      owner: OWNER,
      vehicles: true,
      vehiclesAfter: 'vc1',
      account: true,
      accountAfter: 'ac1',
    });
    expect(third[1]).toEqual({ tokenId: 2, after: 'v2c' });
  });

  it('stops asking for what has no next page', async () => {
    mockQuery
      .mockResolvedValueOnce({
        data: {
          vehicles: page([vehicle(1, page([]))], 'vc1'),
          account: { sacds: page([]) },
        },
        errors: [],
      })
      .mockResolvedValueOnce({
        data: { vehicles: page([vehicle(2, page([]))]) },
        errors: [],
      });

    await fetchConnectedAppGrants(OWNER);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][1]).toMatchObject({ vehicles: true, account: false });
  });

  it('stops when identity-api’s paging doesn’t move on', async () => {
    mockQuery.mockResolvedValue({
      data: { vehicles: page([], 'vc1'), account: { sacds: page([]) } },
      errors: [],
    });
    await expect(fetchConnectedAppGrants(OWNER)).rejects.toThrow();
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('stops when a next page has no cursor', async () => {
    mockQuery.mockResolvedValue({
      data: {
        vehicles: { nodes: [], pageInfo: { hasNextPage: true, endCursor: null } },
        account: { sacds: page([]) },
      },
      errors: [],
    });
    await expect(fetchConnectedAppGrants(OWNER)).rejects.toThrow();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('stops after 40 pages', async () => {
    let n = 0;
    mockQuery.mockImplementation(async () => ({
      data: { account: { sacds: page([grant('0xg1')], `ac${(n += 1)}`) } },
      errors: [],
    }));
    await expect(fetchAccountGrants(OWNER)).rejects.toThrow();
    expect(mockQuery).toHaveBeenCalledTimes(40);
  });

  it('stops when a vehicle’s grants page without moving on', async () => {
    mockQuery
      .mockResolvedValueOnce({
        data: {
          vehicles: page([vehicle(1, page([], 'v1c'))]),
          account: { sacds: page([]) },
        },
        errors: [],
      })
      .mockResolvedValue({ data: { vehicle: { sacds: page([], 'v1c') } }, errors: [] });
    await expect(fetchConnectedAppGrants(OWNER)).rejects.toThrow();
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('throws when identity-api fails, rather than show a partial list', async () => {
    mockQuery.mockResolvedValueOnce({ data: null, errors: [{ message: 'boom' }] });
    await expect(fetchConnectedAppGrants(OWNER)).rejects.toThrow('boom');
  });

  it('reads the account’s grants on their own', async () => {
    mockQuery
      .mockResolvedValueOnce({
        data: { account: { sacds: page([grant('0xg2')], 'ac1') } },
        errors: [],
      })
      .mockResolvedValueOnce({
        data: { account: { sacds: page([grant('0xg3')]) } },
        errors: [],
      });
    const grants = await fetchAccountGrants(OWNER);
    expect(grants.map((g) => g.grantee)).toEqual(['0xg2', '0xg3']);
    expect(mockQuery.mock.calls[0][1]).toMatchObject({ vehicles: false, account: true });
  });

  it('looks up license aliases in one query, passing the addresses as variables', async () => {
    mockQuery.mockResolvedValueOnce({
      data: { l0: { alias: 'Acme' }, l1: null },
      errors: [{ message: 'not found', path: ['l1'], extensions: { code: 'NOT_FOUND' } }],
    });
    const aliases = await fetchLicenseAliases([
      '0x00000000000000000000000000000000000000A1',
      '0x00000000000000000000000000000000000000a2',
      '0x00000000000000000000000000000000000000a1',
    ]);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [query, variables] = mockQuery.mock.calls[0];
    expect(query).not.toContain('0x0000');
    expect(variables).toEqual({
      c0: '0x00000000000000000000000000000000000000a1',
      c1: '0x00000000000000000000000000000000000000a2',
    });
    expect(aliases.get('0x00000000000000000000000000000000000000a1')).toBe('Acme');
    expect(aliases.get('0x00000000000000000000000000000000000000a2')).toBeNull();
  });

  it('answers no aliases when the lookup fails, so the list still shows', async () => {
    mockQuery.mockRejectedValueOnce(new Error('timeout'));
    const aliases = await fetchLicenseAliases([
      '0x00000000000000000000000000000000000000a1',
    ]);
    expect(aliases.size).toBe(0);
  });

  it('skips anything that isn’t an address, and asks nothing for no addresses', async () => {
    expect((await fetchLicenseAliases(['not-an-address'])).size).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('fetchVehiclesStillGranted', () => {
  const mockQuery = queryIdentity as Mock;
  const G = '0x00000000000000000000000000000000000000B1';

  beforeEach(() => mockQuery.mockReset());

  it('asks for each vehicle’s grant to the app in one query, by variables', async () => {
    mockQuery.mockResolvedValueOnce({
      data: {
        v0: { sacd: { expiresAt: '2999-01-01T00:00:00Z' } },
        v1: { sacd: null },
        v2: { sacd: { expiresAt: '1970-01-01T00:00:00Z' } },
      },
      errors: [],
    });
    await expect(fetchVehiclesStillGranted([7, 8, 9], G)).resolves.toEqual([7]);
    const [query, variables] = mockQuery.mock.calls[0];
    expect(query).toMatch(/v0: vehicle\(tokenId: \$t0\) \{ sacd\(grantee: \$grantee\)/);
    expect(variables).toEqual({ grantee: G.toLowerCase(), t0: 7, t1: 8, t2: 9 });
  });

  it('asks 50 vehicles at a time', async () => {
    mockQuery.mockResolvedValue({ data: {}, errors: [] });
    await fetchVehiclesStillGranted(
      Array.from({ length: 120 }, (_, i) => i + 1),
      G,
    );
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  it('throws when the answer isn’t whole', async () => {
    mockQuery.mockResolvedValueOnce({ data: null, errors: [{ message: 'boom' }] });
    await expect(fetchVehiclesStillGranted([7], G)).rejects.toThrow('boom');
  });

  it('asks nothing for no vehicles', async () => {
    await expect(fetchVehiclesStillGranted([], G)).resolves.toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
