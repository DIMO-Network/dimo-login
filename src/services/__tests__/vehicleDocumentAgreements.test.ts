import {
  checkDocumentAccess,
  getMissingFileLabels,
  hasRequestedAgreements,
  toCloudEventAgreements,
} from '../vehicleDocumentAgreements';

const VEHICLE_DID = 'did:erc721:137:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:186612';
const VEHICLE_DOCS = { eventType: 'dimo.document.vehicle.*', tags: ['documents'] } as any;

const sacdDocument = (agreements: object[]) => ({ data: { agreements } });

describe('toCloudEventAgreements', () => {
  it('accepts a single agreement or a list, and fills ids and tags', () => {
    expect(toCloudEventAgreements(undefined)).toEqual([]);
    expect(
      toCloudEventAgreements({ eventType: 'dimo.document.vehicle.*' } as any),
    ).toEqual([{ eventType: 'dimo.document.vehicle.*', ids: [], tags: [] }]);
    expect(toCloudEventAgreements([VEHICLE_DOCS, VEHICLE_DOCS])).toHaveLength(2);
  });
});

describe('hasRequestedAgreements', () => {
  it('matches a cloudevent agreement on this vehicle, ignoring DID case', () => {
    const doc = sacdDocument([
      { type: 'permission', asset: VEHICLE_DID },
      {
        type: 'cloudevent',
        eventType: 'dimo.document.vehicle.*',
        asset: VEHICLE_DID.toLowerCase(),
      },
    ]);
    expect(hasRequestedAgreements(doc, VEHICLE_DID, [VEHICLE_DOCS])).toBe(true);
  });

  it('rejects the old placeholder asset', () => {
    const doc = sacdDocument([
      { type: 'cloudevent', eventType: 'dimo.document.vehicle.*', asset: 'did:' },
    ]);
    expect(hasRequestedAgreements(doc, VEHICLE_DID, [VEHICLE_DOCS])).toBe(false);
  });

  it('requires every requested event type', () => {
    const doc = sacdDocument([
      { type: 'cloudevent', eventType: 'dimo.document.vehicle.*', asset: VEHICLE_DID },
    ]);
    const requested = [
      VEHICLE_DOCS,
      { eventType: 'dimo.raw.vehicle.*', tags: [] } as any,
    ];
    expect(hasRequestedAgreements(doc, VEHICLE_DID, requested)).toBe(false);
  });

  it('handles documents without agreements', () => {
    expect(hasRequestedAgreements({}, VEHICLE_DID, [VEHICLE_DOCS])).toBe(false);
  });
});

describe('checkDocumentAccess', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('is undefined when no files are requested', async () => {
    expect(
      await checkDocumentAccess({ tokenDID: VEHICLE_DID, source: 'ipfs://x' }, []),
    ).toBe(undefined);
  });

  it('is false for a grant with no source document', async () => {
    expect(
      await checkDocumentAccess({ tokenDID: VEHICLE_DID, source: '' }, [VEHICLE_DOCS]),
    ).toBe(false);
  });

  it('reads the source document from the gateway', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        sacdDocument([
          {
            type: 'cloudevent',
            eventType: 'dimo.document.vehicle.*',
            asset: VEHICLE_DID,
          },
        ]),
    }) as any;
    const access = await checkDocumentAccess(
      { tokenDID: VEHICLE_DID, source: 'ipfs://bafycid' },
      [VEHICLE_DOCS],
    );
    expect(access).toBe(true);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://assets.dimo.org/ipfs/bafycid',
    );
  });

  it('is undefined when the gateway fails, so nobody is prompted on a guess', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as any;
    const access = await checkDocumentAccess(
      { tokenDID: VEHICLE_DID, source: 'ipfs://bafycid' },
      [VEHICLE_DOCS],
    );
    expect(access).toBe(undefined);
  });
});

describe('getMissingFileLabels', () => {
  it('names the requested files only when a grant lacks them', () => {
    const requested = [
      VEHICLE_DOCS,
      { eventType: 'dimo.raw.vehicle.*', tags: [] } as any,
    ];
    expect(getMissingFileLabels([{ documentAccess: true }], requested)).toEqual([]);
    expect(getMissingFileLabels([{ documentAccess: false }], requested)).toEqual([
      'Vehicle documents',
      'Original vehicle document files',
    ]);
  });
});
