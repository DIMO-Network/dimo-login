import { fetchVehicles } from '../identityService';
import { apolloClient } from '../apollo';

jest.mock('../apollo', () => ({
  apolloClient: {
    query: jest.fn(),
  },
}));

describe('fetchVehicles', () => {
  const mockQuery = apolloClient.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ data: { vehicles: { nodes: [], pageInfo: {} } } });
  });

  it('passes correct variables for next direction with cursor', async () => {
    await fetchVehicles({ ownerAddress: '0x123', direction: 'next', cursor: 'abc' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          owner: '0x123',
          first: 100,
          after: 'abc',
        }),
      }),
    );
  });

  it('passes correct variables for next direction without cursor', async () => {
    await fetchVehicles({ ownerAddress: '0x123', direction: 'next', cursor: '' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          owner: '0x123',
          first: 100,
        }),
      }),
    );
  });

  it('passes correct variables for previous direction with cursor', async () => {
    await fetchVehicles({ ownerAddress: '0x456', direction: 'prev', cursor: 'def' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          owner: '0x456',
          last: 100,
          before: 'def',
        }),
      }),
    );
  });

  it('passes correct variables for previous direction without cursor', async () => {
    await fetchVehicles({ ownerAddress: '0x456', direction: 'prev', cursor: '' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          owner: '0x456',
          last: 100,
        }),
      }),
    );
  });
});
