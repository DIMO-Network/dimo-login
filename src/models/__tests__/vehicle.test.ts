import type { Mock } from 'vitest';
import { LocalVehicle } from '../vehicle';
import * as services from '../../services/identityService';

vi.mock('@dimo-network/transactions', async () => ({
  ...(await vi.importActual<object>('@dimo-network/transactions')),
  ENVIRONMENT: 'mock',
}));

describe('LocalVehicle', () => {
  const mockVehicleNode = {
    tokenId: 123,
    tokenDID: 'did:erc721:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:123',
    imageURI: 'http://image.url',
    definition: {
      id: 'mock_def_id',
      make: 'Tesla',
      model: 'Model S',
      year: 2022,
    },
    sacds: {
      nodes: [
        { expiresAt: '2025-01-01T00:00:00Z', grantee: '0xc11e01' },
        { expiresAt: '2026-01-01T00:00:00Z', grantee: 'client-2' },
      ],
    },
  };

  let localVehicle: LocalVehicle;

  beforeEach(() => {
    localVehicle = new LocalVehicle(mockVehicleNode as any);
  });

  it('returns tokenId, make, model, year, and definitionId', () => {
    expect(localVehicle.tokenId).toBe(123);
    expect(localVehicle.make).toBe('Tesla');
    expect(localVehicle.model).toBe('Model S');
    expect(localVehicle.year).toBe(2022);
    expect(localVehicle.definitionId).toBe('mock_def_id');
  });

  it('returns correct sacd for grantee', () => {
    expect(localVehicle.getSacdForGrantee('0xc11e01')).toEqual({
      expiresAt: '2025-01-01T00:00:00Z',
      grantee: '0xc11e01',
    });
    expect(localVehicle.getSacdForGrantee('0x0ther')).toBeUndefined();
  });

  it('normalizes vehicle data', () => {
    expect(localVehicle.normalize()).toEqual({
      tokenId: 123,
      tokenDID: 'did:erc721:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:123',
      imageURI: 'http://image.url',
      make: 'Tesla',
      model: 'Model S',
      year: 2022,
    });
  });

  describe('getPowertrainType', () => {
    beforeEach(() => {
      vi.spyOn(services, 'fetchDeviceDefinition').mockResolvedValue({
        deviceDefinition: {
          attributes: [
            { name: 'powertrain_type', value: 'BEV' },
            { name: 'other', value: 'foo' },
          ],
        },
      } as any);
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });
    it('returns the powertrain type if present', async () => {
      await expect(localVehicle.getPowertrainType()).resolves.toBe('BEV');
    });
    it('returns null if powertrain_type attribute is missing', async () => {
      (services.fetchDeviceDefinition as Mock).mockResolvedValueOnce({
        deviceDefinition: { attributes: [{ name: 'other', value: 'foo' }] },
      });
      await expect(localVehicle.getPowertrainType()).resolves.toBeNull();
    });
    it('returns null if attributes is undefined', async () => {
      (services.fetchDeviceDefinition as Mock).mockResolvedValueOnce({
        deviceDefinition: { attributes: undefined },
      });
      await expect(localVehicle.getPowertrainType()).resolves.toBeNull();
    });
  });
});
