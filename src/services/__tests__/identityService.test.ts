import type { Mock } from 'vitest';
import {
  fetchVehicles,
  fetchPowertrainTypes,
  getDeveloperLicense,
} from '../identityService';
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

  // identity-api's answer for an id it doesn't know (devicedefinition.go).
  const unknown = (alias: string) => ({
    message: 'no device definition found with that id',
    path: [alias],
  });

  it('reads powertrain_type per definition, null when unknown', async () => {
    mockQuery.mockResolvedValue({
      data: {
        d0: { attributes: [{ name: 'powertrain_type', value: 'BEV' }] },
        d1: null,
      },
      errors: [unknown('d1')],
    });
    await expect(fetchPowertrainTypes(['a', 'b'])).resolves.toEqual(
      new Map([
        ['a', 'BEV'],
        ['b', null],
      ]),
    );
  });

  it('maps a definition it doesn’t know to null even when it is the only one', async () => {
    // A user whose vehicles all share one definition identity-api lacks.
    mockQuery.mockResolvedValue({ data: { d0: null }, errors: [unknown('d0')] });
    await expect(fetchPowertrainTypes(['a'])).resolves.toEqual(new Map([['a', null]]));
  });

  it('throws when a lookup failed for any other reason', async () => {
    // An upstream failure for one definition fails the list, as before.
    mockQuery.mockResolvedValue({
      data: {
        d0: { attributes: [{ name: 'powertrain_type', value: 'BEV' }] },
        d1: null,
      },
      errors: [{ message: 'error from Tableland', path: ['d1'] }],
    });
    await expect(fetchPowertrainTypes(['a', 'b'])).rejects.toThrow(
      'error from Tableland',
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

describe('getDeveloperLicense', () => {
  const mockQuery = queryIdentity as Mock;
  const CLIENT_ID = '0xb92d74B468B4047289AEa7c9B953066E39768C16';
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockQuery.mockReset();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  it('returns the license', async () => {
    const license = { owner: '0x1', alias: 'Acme', redirectURIs: { nodes: [] } };
    mockQuery.mockResolvedValue({ data: { developerLicense: license }, errors: [] });
    await expect(getDeveloperLicense(CLIENT_ID)).resolves.toEqual(license);
  });

  it('returns null for a license identity-api doesn’t know', async () => {
    mockQuery.mockResolvedValue({
      data: { developerLicense: null },
      errors: [
        {
          message: `No developer license with client id ${CLIENT_ID}.`,
          path: ['developerLicense'],
          extensions: { code: 'NOT_FOUND' },
        },
      ],
    });
    await expect(getDeveloperLicense(CLIENT_ID)).resolves.toBeNull();
  });

  it('throws when identity-api couldn’t look it up', async () => {
    // A resolver failure answers 200 with an error; it isn't a bad client ID.
    mockQuery.mockResolvedValue({
      data: null,
      errors: [{ message: 'database timeout', path: ['developerLicense'] }],
    });
    await expect(getDeveloperLicense(CLIENT_ID)).rejects.toThrow('database timeout');
  });
});
