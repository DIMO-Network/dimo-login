import React from 'react';
import { render, waitFor, act } from '@testing-library/react';

import { DevCredentialsProvider } from '../DevCredentialsContext';
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
jest.mock('../../services/configurationService', () => ({ getConfigurationById: jest.fn() }));
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

const renderProvider = () =>
  render(
    <UIManagerProvider>
      <GlobalOraclesProvider>
        <DevCredentialsProvider>
          <div data-testid="child" />
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

    await waitFor(() =>
      expect(fetchOemBrandMock).toHaveBeenCalledWith(CLIENT_ID, 'GM'),
    );
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

    await waitFor(() =>
      expect(fetchOemBrandMock).toHaveBeenCalledWith(CLIENT_ID, 'GM'),
    );
  });

  it('forwards the SDK brandName verbatim (server scopes it to clientId)', async () => {
    renderProvider();
    await dispatchAuthInit({ clientId: CLIENT_ID, brandName: 'SomeOtherLicenseBrand' });

    await waitFor(() =>
      expect(fetchOemBrandMock).toHaveBeenCalledWith(
        CLIENT_ID,
        'SomeOtherLicenseBrand',
      ),
    );
  });
});
