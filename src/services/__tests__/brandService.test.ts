import { fetchOemBrand, readCachedBrand } from '../brandService';

const CLIENT_ID = '0xb92d74B468B4047289AEa7c9B953066E39768C16';

const okResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body } as unknown as Response);

const errResponse = (status: number): Response =>
  ({ ok: false, status, json: async () => ({}) } as unknown as Response);

describe('brandService cache', () => {
  beforeEach(() => {
    localStorage.clear();
    (global as { fetch: jest.Mock }).fetch = jest.fn();
  });

  it('readCachedBrand returns null when nothing cached', () => {
    expect(readCachedBrand(CLIENT_ID)).toBeNull();
  });

  it('caches a successful brand and reads it back (case-insensitive key)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      okResponse({ name: 'Toyota', logoUrl: 'https://cdn/logo.svg', primaryColor: '#EB0A1E' }),
    );

    const brand = await fetchOemBrand(CLIENT_ID);
    expect(brand).toEqual({
      name: 'Toyota',
      logoUrl: 'https://cdn/logo.svg',
      iconUrl: null,
      primaryColor: '#EB0A1E',
    });

    // lookup with different casing hits the same cache entry
    expect(readCachedBrand(CLIENT_ID.toLowerCase())).toEqual(brand);
  });

  it('drops non-https logo urls before caching', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      okResponse({ name: 'Toyota', logoUrl: 'http://insecure/logo.svg' }),
    );
    const brand = await fetchOemBrand(CLIENT_ID);
    expect(brand?.logoUrl).toBeNull();
    expect(readCachedBrand(CLIENT_ID)?.logoUrl).toBeNull();
  });

  it('clears the cache on a 404 (brand removed)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okResponse({ name: 'Toyota' }));
    await fetchOemBrand(CLIENT_ID);
    expect(readCachedBrand(CLIENT_ID)).not.toBeNull();

    (global.fetch as jest.Mock).mockResolvedValueOnce(errResponse(404));
    expect(await fetchOemBrand(CLIENT_ID)).toBeNull();
    expect(readCachedBrand(CLIENT_ID)).toBeNull();
  });

  it('keeps last-known-good cache on a transient 5xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(okResponse({ name: 'Toyota' }));
    await fetchOemBrand(CLIENT_ID);

    (global.fetch as jest.Mock).mockResolvedValueOnce(errResponse(503));
    expect(await fetchOemBrand(CLIENT_ID)).toBeNull();
    expect(readCachedBrand(CLIENT_ID)?.name).toBe('Toyota');
  });

  it('readCachedBrand survives corrupt JSON', () => {
    localStorage.setItem('dimo:oemBrand:' + CLIENT_ID.toLowerCase(), '{not json');
    expect(readCachedBrand(CLIENT_ID)).toBeNull();
  });
});
