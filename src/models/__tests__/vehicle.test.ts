import { LocalVehicle } from '../vehicle';
import * as services from '../../services/identityService';

jest.mock('@dimo-network/transactions', () => ({
  ENVIRONMENT: 'mock',
  // add more mocked exports if needed
}));

describe('LocalVehicle', () => {
  const mockVehicleNode = {
    tokenId: 123,
    imageURI: 'http://image.url',
    definition: {
      id: 'mock_def_id',
      make: 'Tesla',
      model: 'Model S',
      year: 2022,
    },
    sacds: {
      nodes: [
        { expiresAt: '2025-01-01T00:00:00Z', grantee: 'client-1' },
        { expiresAt: '2026-01-01T00:00:00Z', grantee: 'client-2' },
      ],
    },
  };

  const clientId = 'client-1';
  let localVehicle: LocalVehicle;

  beforeEach(() => {
    localVehicle = new LocalVehicle(mockVehicleNode as any, clientId);
  });

  it('matches tokenId correctly', () => {
    expect(localVehicle.getTokenIdMatch('123')).toBe(true);
    expect(localVehicle.getTokenIdMatch('999')).toBe(false);
  });

  it('matches make correctly (case-insensitive)', () => {
    expect(localVehicle.getMakeMatch('tesla')).toBe(true);
    expect(localVehicle.getMakeMatch('ford')).toBe(false);
  });

  it('returns make, model, and year', () => {
    expect(localVehicle.make).toBe('Tesla');
    expect(localVehicle.model).toBe('Model S');
    expect(localVehicle.year).toBe(2022);
  });

  it('returns correct sacd for client', () => {
    expect(localVehicle.sacd).toEqual({
      expiresAt: '2025-01-01T00:00:00Z',
      grantee: 'client-1',
    });
  });

  it('returns isShared true if sacd exists for client', () => {
    expect(localVehicle.isShared).toBe(true);
    const lv2 = new LocalVehicle(mockVehicleNode as any, 'not-a-client');
    expect(lv2.isShared).toBe(false);
  });

  it('returns formatted expiresAt if sacd exists, else empty string', () => {
    expect(localVehicle.expiresAt).toBe('2025-01-01T00:00:00Z');
    const lv2 = new LocalVehicle(mockVehicleNode as any, 'not-a-client');
    expect(lv2.expiresAt).toBe('');
  });

  describe('getPowertrainTypeMatch', () => {
    beforeEach(() => {
      jest
        .spyOn(services, 'fetchDeviceDefinition')
        .mockImplementation(async (id: string) => {
          return {
            deviceDefinition: {
              attributes: [
                { name: 'powertrain_type', value: 'BEV' },
                { name: 'other', value: 'foo' },
              ],
            },
          };
        });
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });
    it('returns true if powertrain type matches (case-insensitive)', async () => {
      await expect(localVehicle.getPowertrainTypeMatch(['bev'])).resolves.toBe(true);
      await expect(localVehicle.getPowertrainTypeMatch(['BEV'])).resolves.toBe(true);
      await expect(localVehicle.getPowertrainTypeMatch(['ICE'])).resolves.toBe(false);
    });
    it('returns false if no powertrain_type attribute', async () => {
      (services.fetchDeviceDefinition as jest.Mock).mockResolvedValueOnce({
        deviceDefinition: { attributes: [{ name: 'other', value: 'foo' }] },
      });
      await expect(localVehicle.getPowertrainTypeMatch(['BEV'])).resolves.toBe(false);
    });
    it('returns false if attributes is undefined', async () => {
      (services.fetchDeviceDefinition as jest.Mock).mockResolvedValueOnce({
        deviceDefinition: { attributes: undefined },
      });
      await expect(localVehicle.getPowertrainTypeMatch(['BEV'])).resolves.toBe(false);
    });
  });
});
