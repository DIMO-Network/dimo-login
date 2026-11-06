import type { Mock } from 'vitest';
import { fetchVehicles } from '../identityService';
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
