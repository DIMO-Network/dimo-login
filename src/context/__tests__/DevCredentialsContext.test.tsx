import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

import { DevCredentialsProvider, useDevCredentials } from '../DevCredentialsContext';
import { UIManagerProvider } from '../UIManagerContext';
import { GlobalOraclesProvider } from '../OraclesContext';
import { fetchOemBrand } from '../../services/brandService';

// The seam under test is `validateCredentials` → `fetchOemBrand(clientId, brandName)`.
// Everything the provider touches on the way there is mocked so the test asserts
// only *which brandName reaches the brand fetch* in each transport.
jest.mock('../../services/brandService', () => ({
  fetchOemBrand: jest.fn().mockResolvedValue(null),
  readCachedBrand: jest.fn().mockReturnValue(null),
}));
jest.mock('../../services/identityService', () => ({
  getDeveloperLicense: jest.fn().mockResolvedValue({}),
  getLicenseAlias: jest.fn().mockResolvedValue('Acme'),
  isValidDeveloperLicense: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/turnkeyService', () => ({
  createKernelSigner: jest.fn(),
}));
jest.mock('../../services/storageService', () => ({ setEmailGranted: jest.fn() }));
jest.mock('../../services/configurationService', () => ({
  getConfigurationById: jest.fn(),
}));
jest.mock('../../services', () => ({ fetchConfigFromIPFS: jest.fn() }));
jest.mock('../../utils/messageHandler', () => ({ sendMessageToReferrer: jest.fn() }));
jest.mock('../../utils/isStandalone', () => ({ isStandalone: () => false }));
// The `../hooks` barrel re-exports vehicle hooks that pull in @dimo-network/transactions
// (untransformed ESM). Keep the real useParamsHandler — it's the code that funnels
// brandName into state — and skip loading the rest of the barrel.
jest.mock('../../hooks', () => ({
  useParamsHandler: jest.requireActual('../../hooks/useParamsHandler').useParamsHandler,
}));

const CLIENT_ID = '0xb92d74B468B4047289AEa7c9B953066E39768C16';
const fetchOemBrandMock = fetchOemBrand as jest.Mock;

// Surfaces a single state key so tests can assert what did (and didn't) land in
// devCredentialsState after a postMessage.
const StateProbe = ({ probeKey }: { probeKey: string }) => {
  const value = useDevCredentials<Record<string, unknown>>();
  return <span data-testid="probe">{JSON.stringify(value[probeKey] ?? null)}</span>;
};

const renderProvider = (probeKey = 'clientId') =>
  render(
    <UIManagerProvider>
      <GlobalOraclesProvider>
        <DevCredentialsProvider>
          <StateProbe probeKey={probeKey} />
        </DevCredentialsProvider>
      </GlobalOraclesProvider>
    </UIManagerProvider>,
  );

const dispatchAuthInit = async (data: Record<string, unknown>) => {
  // initAuthProcess is async; let its awaits resolve so the AUTH_INIT message
  // listener is attached before we dispatch (otherwise the event is missed).
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    window.dispatchEvent(
      new MessageEvent('message', { data: { eventType: 'AUTH_INIT', ...data } }),
    );
  });
};

beforeEach(() => {
  fetchOemBrandMock.mockClear();
  window.history.pushState({}, '', '/');
});

describe('DevCredentialsContext brand forwarding', () => {
  it('popup: forwards brandName from the AUTH_INIT message', async () => {
    renderProvider();
    await dispatchAuthInit({ clientId: CLIENT_ID, brandName: 'GM' });

    await waitFor(() => expect(fetchOemBrandMock).toHaveBeenCalledWith(CLIENT_ID, 'GM'));
  });

  it('popup: no brandName → brand fetch gets undefined (default chrome)', async () => {
    renderProvider();
    await dispatchAuthInit({ clientId: CLIENT_ID });

    await waitFor(() => expect(fetchOemBrandMock).toHaveBeenCalled());
    expect(fetchOemBrandMock).toHaveBeenCalledWith(CLIENT_ID, undefined);
  });

  it('redirect: forwards brandName from the URL query', async () => {
    window.history.pushState({}, '', `/?clientId=${CLIENT_ID}&brandName=GM`);
    renderProvider();

    await waitFor(() => expect(fetchOemBrandMock).toHaveBeenCalledWith(CLIENT_ID, 'GM'));
  });

  it('forwards the SDK brandName verbatim (server scopes it to clientId)', async () => {
    renderProvider();
    await dispatchAuthInit({ clientId: CLIENT_ID, brandName: 'SomeOtherLicenseBrand' });

    await waitFor(() =>
      expect(fetchOemBrandMock).toHaveBeenCalledWith(CLIENT_ID, 'SomeOtherLicenseBrand'),
    );
  });

  it('popup: drops a non-allowlisted key from the AUTH_INIT payload', async () => {
    renderProvider('injectedKey');
    await dispatchAuthInit({ clientId: CLIENT_ID, injectedKey: 'pwn' });

    // wait until the message has been processed (clientId drives the brand fetch)
    await waitFor(() => expect(fetchOemBrandMock).toHaveBeenCalled());
    expect(screen.getByTestId('probe').textContent).toBe('null');
  });
});

describe('DevCredentialsContext cloudEvent (vehicle document access)', () => {
  const AGREEMENTS = [
    { eventType: 'dimo.document.vehicle.*', ids: [], tags: ['documents'] },
    { eventType: 'dimo.raw.vehicle.*', ids: [], tags: ['documents'] },
  ];

  it('redirect: parses cloudEvent exactly as the SDK encodes it', async () => {
    // login-with-dimo redirectAuth: encodeURIComponent(JSON), then URLSearchParams.
    const params = new URLSearchParams({ clientId: CLIENT_ID });
    params.append('cloudEvent', encodeURIComponent(JSON.stringify(AGREEMENTS)));
    window.history.pushState({}, '', `/?${params.toString()}`);
    renderProvider('cloudEvent');

    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe(JSON.stringify(AGREEMENTS)),
    );
  });

  it('popup: keeps cloudEvent from the SHARE_VEHICLES_DATA message', async () => {
    renderProvider('cloudEvent');
    await dispatchAuthInit({ clientId: CLIENT_ID, entryState: 'VEHICLE_MANAGER' });
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { eventType: 'SHARE_VEHICLES_DATA', cloudEvent: AGREEMENTS },
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe(JSON.stringify(AGREEMENTS)),
    );
  });

  it('warns when some requested cloudEvents are not supported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const params = new URLSearchParams({
      clientId: CLIENT_ID,
      cloudEvent: JSON.stringify([...AGREEMENTS, { eventType: 'dimo.attestation' }]),
    });
    window.history.pushState({}, '', `/?${params.toString()}`);
    renderProvider('cloudEvent');

    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Ignoring 1 cloudEvent')),
    );
    warn.mockRestore();
  });

  it('ignores a malformed cloudEvent param instead of crashing', async () => {
    window.history.pushState({}, '', `/?clientId=${CLIENT_ID}&cloudEvent=%5B%7Bbroken`);
    renderProvider('cloudEvent');

    await waitFor(() => expect(fetchOemBrandMock).toHaveBeenCalled());
    expect(screen.getByTestId('probe').textContent).toBe('null');
  });

  it('accepts plain JSON in a hand-built link', async () => {
    const params = new URLSearchParams({
      clientId: CLIENT_ID,
      cloudEvent: JSON.stringify(AGREEMENTS),
    });
    window.history.pushState({}, '', `/?${params.toString()}`);
    renderProvider('cloudEvent');

    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe(JSON.stringify(AGREEMENTS)),
    );
  });

  it('OAuth return: restores cloudEvent from the state param', async () => {
    const state = JSON.stringify({ clientId: CLIENT_ID, cloudEvent: AGREEMENTS });
    window.history.pushState({}, '', `/?state=${encodeURIComponent(state)}`);
    renderProvider('cloudEvent');

    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe(JSON.stringify(AGREEMENTS)),
    );
  });
});
