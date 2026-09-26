import {
  checkDocumentAccess,
  clearGrantReadCache,
  coversAll,
  getMissingFileLabels,
  getVehicleAgreements,
  GrantUnreadableError,
  mergeAgreements,
  readGrantAgreements,
  toCloudEventAgreements,
  withSource,
} from '../vehicleDocumentAgreements';

const DID = 'did:erc721:137:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:186612';
const GRANTOR = '0x1111111111111111111111111111111111111111';
const VEHICLE_DOCS = {
  eventType: 'dimo.document.vehicle.*',
  ids: [],
  tags: ['documents'],
};
const RAW_DOCS = { eventType: 'dimo.raw.vehicle.*', ids: [], tags: ['documents'] };

const APP = '0x2222222222222222222222222222222222222222';
const PARTIES = { grantor: GRANTOR, grantee: APP };
// A SACD document between this user and this app.
const sacdDocument = (agreements: object[], parties = PARTIES) => ({
  type: 'dimo.sacd',
  data: {
    grantor: { address: parties.grantor },
    grantee: { address: parties.grantee },
    agreements,
  },
});
const vehicle = (source?: string) => ({ tokenId: 186612, tokenDID: DID, source });

const mockGateway = (response: object | Error) => {
  global.fetch = jest.fn(async () => {
    if (response instanceof Error) throw response;
    return { ok: true, json: async () => response };
  }) as any;
};
const originalFetch = global.fetch;
beforeEach(() => clearGrantReadCache());
afterEach(() => {
  global.fetch = originalFetch;
});

describe('toCloudEventAgreements', () => {
  it('accepts a single agreement or a list, and fills ids and tags', () => {
    expect(toCloudEventAgreements(undefined)).toEqual([]);
    expect(
      toCloudEventAgreements({ eventType: 'dimo.document.vehicle.*' } as any),
    ).toEqual([{ eventType: 'dimo.document.vehicle.*', ids: [], tags: [] }]);
    expect(toCloudEventAgreements([VEHICLE_DOCS, RAW_DOCS] as any)).toHaveLength(2);
  });

  it('drops entries a signer would widen to every attestation', () => {
    expect(
      toCloudEventAgreements([
        {},
        5,
        null,
        { event_type: 'x' },
        { eventType: '' },
      ] as any),
    ).toEqual([]);
  });

  it('accepts only the document patterns the consent screen can name', () => {
    expect(
      toCloudEventAgreements([
        { eventType: '<img src=https://x onerror=alert(1)>' },
        { eventType: 'dimo.attestation' },
        { eventType: '*' },
        { eventType: 'dimo.raw.driver.*' },
      ] as any).map((a) => a.eventType),
    ).toEqual(['dimo.raw.driver.*']);
  });

  it('drops malformed entries whole instead of widening or redirecting them', () => {
    expect(
      toCloudEventAgreements([
        { eventType: 'dimo.document.vehicle.*', ids: 'doc-123' }, // would become "all events"
        { eventType: 'dimo.document.vehicle.*', ids: ['a', 3] },
      ] as any),
    ).toEqual([]);
  });

  it("drops entries that name someone else's files", () => {
    // File access is always to the signed-in user's own files.
    expect(
      toCloudEventAgreements([
        {
          eventType: 'dimo.document.vehicle.*',
          source: '0x2222222222222222222222222222222222222222',
        },
        { eventType: 'dimo.document.vehicle.*', source: '0XABC' },
      ] as any),
    ).toEqual([]);
  });

  it('keeps well-formed entries, defaulting only tags', () => {
    expect(
      toCloudEventAgreements({
        eventType: 'dimo.document.vehicle.*',
        ids: ['a'],
        tags: 'x',
      } as any),
    ).toEqual([{ eventType: 'dimo.document.vehicle.*', ids: ['a'], tags: [] }]);
  });
});

describe('getVehicleAgreements', () => {
  it("keeps only this vehicle's cloudevent agreements, ignoring DID case", () => {
    const doc = sacdDocument([
      { type: 'permission', asset: DID },
      {
        type: 'cloudevent',
        eventType: 'dimo.document.vehicle.*',
        asset: DID.toLowerCase(),
        source: GRANTOR,
      },
      { type: 'cloudevent', eventType: 'dimo.raw.vehicle.*', asset: 'did:' },
    ]);
    expect(getVehicleAgreements(doc, DID)).toEqual([
      { eventType: 'dimo.document.vehicle.*', source: GRANTOR, ids: [], tags: [] },
    ]);
  });

  it('handles documents without agreements', () => {
    expect(getVehicleAgreements({}, DID)).toEqual([]);
  });
});

describe('coversAll', () => {
  const existing = [{ ...VEHICLE_DOCS, source: GRANTOR }] as any;

  it('is satisfied by the same event type and source', () => {
    expect(coversAll(existing, withSource([VEHICLE_DOCS] as any, GRANTOR))).toBe(true);
  });

  it('requires every requested event type', () => {
    expect(coversAll(existing, [VEHICLE_DOCS, RAW_DOCS] as any)).toBe(false);
  });

  it('respects requested ids and sources', () => {
    const scoped = [
      { eventType: 'dimo.attestation', source: GRANTOR, ids: ['a'] },
    ] as any;
    expect(
      coversAll(scoped, [{ eventType: 'dimo.attestation', ids: ['a'] }] as any),
    ).toBe(true);
    expect(
      coversAll(scoped, [{ eventType: 'dimo.attestation', ids: ['b'] }] as any),
    ).toBe(false);
    expect(
      coversAll(scoped, [
        {
          eventType: 'dimo.attestation',
          source: '0x2222222222222222222222222222222222222222',
        },
      ] as any),
    ).toBe(false);
  });

  it('never lets specific ids cover a request for all events', () => {
    const specific = [{ ...VEHICLE_DOCS, ids: ['doc1'] }] as any;
    expect(coversAll(specific, [VEHICLE_DOCS] as any)).toBe(false);
    expect(mergeAgreements(specific, [VEHICLE_DOCS] as any)).toHaveLength(2);
  });

  it('treats an empty eventType as the SDK default, as the signer does', () => {
    const signed = [{ eventType: 'dimo.attestation', ids: [] }] as any;
    expect(coversAll(signed, [{ eventType: '', ids: [] }] as any)).toBe(true);
  });
});

describe('mergeAgreements', () => {
  it('keeps what the grant has and adds only what it lacks', () => {
    const existing = [{ ...VEHICLE_DOCS, source: GRANTOR }] as any;
    const merged = mergeAgreements(
      existing,
      withSource([VEHICLE_DOCS, RAW_DOCS] as any, GRANTOR),
    );
    expect(merged.map((a) => a.eventType)).toEqual([
      'dimo.document.vehicle.*',
      'dimo.raw.vehicle.*',
    ]);
  });
});

describe('readGrantAgreements', () => {
  it('returns nothing for a grant without a source document', async () => {
    expect(await readGrantAgreements(vehicle(''), PARTIES)).toEqual([]);
  });

  it('reads the source document from the gateway', async () => {
    mockGateway(
      sacdDocument([
        { type: 'cloudevent', eventType: 'dimo.document.vehicle.*', asset: DID },
      ]),
    );
    const agreements = await readGrantAgreements(vehicle('ipfs://bafycid'), PARTIES);
    expect(agreements).toHaveLength(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://assets.dimo.org/ipfs/bafycid',
    );
  });

  it('caches ipfs reads by source', async () => {
    mockGateway(sacdDocument([]));
    await readGrantAgreements(vehicle('ipfs://same'), PARTIES);
    await readGrantAgreements(vehicle('ipfs://same'), PARTIES);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('reads a legacy permission-grant document as having no file agreements', async () => {
    // Shape of ipfs://QmQoGcXhVjX6J9kYVWZ97KXMw5oVnobaC1Qt5PtPWoubq5, a real
    // pre-SACD grant (most active grants still use this format).
    mockGateway({
      type: 'org.dimo.permission.grant.v1',
      data: {
        templateId: '1',
        version: '1.0',
        grantor: { address: GRANTOR },
        grantee: { address: '0x2222222222222222222222222222222222222222' },
        scope: { permissions: [] },
        effectiveAt: '2025-01-01T00:00:00Z',
        expiresAt: '2026-01-01T00:00:00Z',
        attachments: [],
        description: 'legacy grant',
      },
    });
    await expect(readGrantAgreements(vehicle('ipfs://legacy'), PARTIES)).resolves.toEqual(
      [],
    );
  });

  it('recognises legacy documents by their declared type only', async () => {
    mockGateway({ data: { scope: { permissions: [] } } });
    await expect(
      readGrantAgreements(vehicle('ipfs://untyped'), PARTIES),
    ).rejects.toBeInstanceOf(GrantUnreadableError);
  });

  it('treats an unfamiliar document shape as unreadable, not as "no files"', async () => {
    mockGateway({ signed: { payload: '...' } });
    await expect(
      readGrantAgreements(vehicle('ipfs://wrapped'), PARTIES),
    ).rejects.toBeInstanceOf(GrantUnreadableError);
  });

  it('refuses mutable https documents', async () => {
    await expect(
      readGrantAgreements(vehicle('https://example.com/g.json'), PARTIES),
    ).rejects.toThrow("can't verify");
  });

  it("refuses a document that isn't this user's grant to this app", async () => {
    mockGateway(sacdDocument([], { grantor: GRANTOR, grantee: GRANTOR }));
    await expect(
      readGrantAgreements(vehicle('ipfs://other-app'), PARTIES),
    ).rejects.toThrow("don't match this app");
  });

  it('carries over only known, unexpired document agreements', async () => {
    mockGateway(
      sacdDocument([
        { type: 'cloudevent', eventType: 'dimo.document.vehicle.*', asset: DID },
        { type: 'cloudevent', eventType: 'dimo.attestation', asset: DID },
        {
          type: 'cloudevent',
          eventType: 'dimo.raw.vehicle.*',
          asset: DID,
          expiresAt: '2020-01-01T00:00:00Z',
        },
      ]),
    );
    const agreements = await readGrantAgreements(vehicle('ipfs://mixed'), PARTIES);
    expect(agreements.map((a) => a.eventType)).toEqual(['dimo.document.vehicle.*']);
  });

  it('refuses sources it has no way to read', async () => {
    await expect(readGrantAgreements(vehicle('ar://abc'), PARTIES)).rejects.toThrow(
      "stored somewhere DIMO can't verify",
    );
  });

  it('throws when the grant cannot be read, so callers never drop access blind', async () => {
    mockGateway(new Error('network'));
    await expect(
      readGrantAgreements(vehicle('ipfs://bafycid'), PARTIES),
    ).rejects.toBeInstanceOf(GrantUnreadableError);
  });
});

describe('checkDocumentAccess', () => {
  it('is undefined when no files are requested', async () => {
    expect(await checkDocumentAccess(vehicle('ipfs://x'), [], PARTIES)).toBe(undefined);
  });

  it('is false for a grant with no source document', async () => {
    expect(await checkDocumentAccess(vehicle(''), [VEHICLE_DOCS] as any, PARTIES)).toBe(
      false,
    );
  });

  it('fills the grantor into requested sources before comparing', async () => {
    mockGateway(
      sacdDocument([
        {
          type: 'cloudevent',
          eventType: 'dimo.document.vehicle.*',
          asset: DID,
          source: GRANTOR,
        },
      ]),
    );
    expect(
      await checkDocumentAccess(vehicle('ipfs://c'), [VEHICLE_DOCS] as any, PARTIES),
    ).toBe(true);
  });

  it('is undefined when the gateway fails, so nobody is prompted on a guess', async () => {
    mockGateway(new Error('network'));
    expect(
      await checkDocumentAccess(vehicle('ipfs://c'), [VEHICLE_DOCS] as any, PARTIES),
    ).toBe(undefined);
  });
});

describe('getMissingFileLabels', () => {
  it('names the requested files only when a grant lacks them', () => {
    const requested = [VEHICLE_DOCS, RAW_DOCS] as any;
    expect(getMissingFileLabels([{ documentAccess: true }], requested)).toEqual([]);
    expect(getMissingFileLabels([{ documentAccess: false }], requested)).toEqual([
      'Vehicle documents',
      'Original vehicle document files',
    ]);
  });
});
