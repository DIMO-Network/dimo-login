import type { Mock } from 'vitest';
import { fetchVehicles, fetchPowertrainTypes } from '../identityService';
import { queryIdentity } from '../identityGraphql';

vi.mock('../identityGraphql', () => ({ queryIdentity: vi.fn() }));

describe('fetchVehicles', () => {
  const mockQuery = queryIdentity as Mock;

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({
      data: { vehicles: { nodes: [], pageInfo: {} } },
      errors: [],
    });
  });

  it('passes correct variables for next direction with cursor', async () => {
    await fetchVehicles({ ownerAddress: '0x123', direction: 'next', cursor: 'abc' });
    expect(queryIdentity).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ owner: '0x123', first: 100, after: 'abc' }),
    );
  });

  it('passes correct variables for next direction without cursor', async () => {
    await fetchVehicles({ ownerAddress: '0x123', direction: 'next', cursor: '' });
    expect(queryIdentity).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ owner: '0x123', first: 100 }),
    );
  });

  it('passes correct variables for previous direction with cursor', async () => {
    await fetchVehicles({ ownerAddress: '0x456', direction: 'prev', cursor: 'def' });
    expect(queryIdentity).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ owner: '0x456', last: 100, before: 'def' }),
    );
  });

  it('passes correct variables for previous direction without cursor', async () => {
    await fetchVehicles({ ownerAddress: '0x456', direction: 'prev', cursor: '' });
    expect(queryIdentity).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ owner: '0x456', last: 100 }),
    );
  });

  it('throws the first GraphQL error', async () => {
    mockQuery.mockResolvedValue({
      data: null,
      errors: [{ message: 'boom' }, { message: 'second' }],
    });
    await expect(
      fetchVehicles({ ownerAddress: '0x123', direction: 'next', cursor: '' }),
    ).rejects.toThrow('boom');
  });

  it('throws when the identity API returns no data', async () => {
    mockQuery.mockResolvedValue({ data: null, errors: [] });
    await expect(
      fetchVehicles({ ownerAddress: '0x123', direction: 'next', cursor: '' }),
    ).rejects.toThrow('The identity API returned no vehicles.');
  });
});

describe('fetchPowertrainTypes', () => {
  const mockQuery = queryIdentity as Mock;

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ data: {}, errors: [] });
  });

  it('asks for every definition in one query', async () => {
    await fetchPowertrainTypes(['a', 'b', 'a']);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), { id0: 'a', id1: 'b' });
    const [query] = mockQuery.mock.calls[0];
    expect(query).toContain('d0: deviceDefinition(by: { id: $id0 })');
    expect(query).toContain('d1: deviceDefinition(by: { id: $id1 })');
  });

  it('reads powertrain_type per definition, null when unknown', async () => {
    mockQuery.mockResolvedValue({
      data: {
        d0: { attributes: [{ name: 'powertrain_type', value: 'BEV' }] },
        d1: null,
      },
      errors: [{ message: 'not found' }],
    });
    await expect(fetchPowertrainTypes(['a', 'b'])).resolves.toEqual(
      new Map([
        ['a', 'BEV'],
        ['b', null],
      ]),
    );
  });

  it('throws the first error when every lookup failed', async () => {
    // An upstream outage: 200, with an error for each definition.
    mockQuery.mockResolvedValue({
      data: { d0: null, d1: null },
      errors: [{ message: 'upstream unavailable' }, { message: 'upstream unavailable' }],
    });
    await expect(fetchPowertrainTypes(['a', 'b'])).rejects.toThrow(
      'upstream unavailable',
    );
  });

  it('throws when the lookup returns no data', async () => {
    mockQuery.mockResolvedValue({ data: null, errors: [{ message: 'boom' }] });
    await expect(fetchPowertrainTypes(['a'])).rejects.toThrow();
  });

  it('makes no request for no ids', async () => {
    await expect(fetchPowertrainTypes([])).resolves.toEqual(new Map());
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
