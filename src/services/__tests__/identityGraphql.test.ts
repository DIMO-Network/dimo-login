import { queryIdentity } from '../identityGraphql';

const IDENTITY_URL =
  process.env.REACT_APP_DIMO_IDENTITY_URL || 'https://identity-api.dev.dimo.zone/query';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe('queryIdentity', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('posts the query and variables as JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
    await queryIdentity('q', { a: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      IDENTITY_URL,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"query":"q","variables":{"a":1}}',
      }),
    );
  });

  it('returns data and errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { x: 1 }, errors: [{ message: 'partial' }] }),
    );
    await expect(queryIdentity('q')).resolves.toEqual({
      data: { x: 1 },
      errors: [{ message: 'partial' }],
    });
  });

  it('returns null data and no errors when the body has neither', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await expect(queryIdentity('q')).resolves.toEqual({ data: null, errors: [] });
  });

  it('throws on a non-2xx answer', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 502));
    await expect(queryIdentity('q')).rejects.toThrow('Identity API answered 502');
  });
});
