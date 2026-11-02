import { buildFlowSnapshot, readFlowSnapshot, saveFlowSnapshot } from '../flowSnapshot';
import { reportRefusal } from '../reportRefusal';

vi.mock('../reportRefusal', () => ({ reportRefusal: vi.fn() }));

beforeEach(() => sessionStorage.clear());

describe('flow snapshot for the OAuth round-trip', () => {
  it('restores a share-vehicles request with its expiration as an ISO date', () => {
    const expiration = BigInt(Math.floor(Date.UTC(2027, 9, 27) / 1000));
    const ref = saveFlowSnapshot(
      buildFlowSnapshot({
        devCredentials: {
          clientId: '0xb92d74B468B4047289AEa7c9B953066E39768C16',
          redirectUri: 'https://app.example.com',
          permissionTemplateId: '1',
          vehicleTokenIds: ['12', '34'],
          expirationDate: expiration,
          cloudEvent: [
            { eventType: 'dimo.document.vehicle.*', ids: [], tags: ['documents'] },
          ],
          // Computed state never leaves through the snapshot.
          devLicenseAlias: 'Acme',
          invalidCredentials: false,
        },
        entryState: 'VEHICLE_MANAGER',
        onboardingEnabled: true,
      }),
    );

    const restored = readFlowSnapshot(ref);
    expect(restored).toMatchObject({
      entryState: 'VEHICLE_MANAGER',
      permissionTemplateId: '1',
      vehicleTokenIds: ['12', '34'],
      onboarding: ['tesla'],
      expirationDate: '2027-10-27T00:00:00.000Z',
    });
    expect(restored).not.toHaveProperty('devLicenseAlias');
    expect(restored).not.toHaveProperty('invalidCredentials');
    expect(reportRefusal).not.toHaveBeenCalled();
  });

  it('reports a save that storage refuses, and returns no reference', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    try {
      const clientId = '0xb92d74B468B4047289AEa7c9B953066E39768C16';
      expect(saveFlowSnapshot({ clientId, entryState: 'EMAIL_INPUT' })).toBeUndefined();
      expect(reportRefusal).toHaveBeenCalledTimes(1);
      expect(reportRefusal).toHaveBeenCalledWith('storage_blocked', { clientId });
    } finally {
      setItem.mockRestore();
    }
  });

  it('keeps bigint values in transaction data', () => {
    const ref = saveFlowSnapshot(
      buildFlowSnapshot({
        devCredentials: {
          transactionData: { address: '0xabc', value: BigInt(5), args: [BigInt(7), 'x'] },
        },
        entryState: 'ADVANCED_TRANSACTION',
        onboardingEnabled: false,
      }),
    );

    expect(readFlowSnapshot(ref)?.transactionData).toEqual({
      address: '0xabc',
      value: BigInt(5),
      args: [BigInt(7), 'x'],
    });
  });

  it('ignores a missing, unknown or malformed reference', () => {
    expect(readFlowSnapshot(undefined)).toBeNull();
    expect(readFlowSnapshot('0123456789abcdef0123456789abcdef')).toBeNull();
    expect(readFlowSnapshot('../user_data')).toBeNull();
  });
});
