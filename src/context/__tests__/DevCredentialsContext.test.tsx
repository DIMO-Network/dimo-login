import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

import { DevCredentialsProvider, useDevCredentials } from '../DevCredentialsContext';
import { UIManagerProvider } from '../UIManagerContext';
import { GlobalOraclesProvider } from '../OraclesContext';
import { fetchOemBrand } from '../../services/brandService';
import { fetchConfigFromIPFS } from '../../services';
import { getConfigurationById } from '../../services/configurationService';
import { saveFlowSnapshot } from '../../utils/flowSnapshot';
import {
  getDeveloperLicense,
  getLicenseAlias,
  isValidDeveloperLicense,
} from '../../services/identityService';

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
jest.mock('../../services/configurationService', () => ({
  getConfigurationById: jest.fn(),
}));
jest.mock('../../services', () => ({ fetchConfigFromIPFS: jest.fn() }));
jest.mock('../../utils/messageHandler', () => ({
  sendMessageToReferrer: jest.fn(),
  setAppState: jest.fn(),
}));
jest.mock('../../utils/isStandalone', () => ({ isStandalone: () => false }));
let mockEmbedded = false;
let mockEmbedderOrigin: string | null = null;
jest.mock('../../utils/isEmbed', () => ({
  isEmbed: () => mockEmbedded,
  getEmbedderOrigin: () => mockEmbedderOrigin,
}));
// The `../hooks` barrel re-exports vehicle hooks that pull in @dimo-network/transactions
// (untransformed ESM). Keep the real useParamsHandler — it's the code that funnels
// brandName into state — and skip loading the rest of the barrel.
jest.mock('../../hooks', () => ({
  useParamsHandler: jest.requireActual('../../hooks/useParamsHandler').useParamsHandler,
}));

const CLIENT_ID = '0xb92d74B468B4047289AEa7c9B953066E39768C16';
const APP_ORIGIN = 'https://app.example';
const REDIRECT_URI = `${APP_ORIGIN}/callback`;
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

// In jsdom the page has no opener, so its "parent" is itself: messages from
// the app's window come from `window`.
const dispatchMessage = async (
  data: Record<string, unknown>,
  { origin = APP_ORIGIN, source = window as MessageEventSource | null } = {},
) => {
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data, origin, source }));
  });
};

const dispatchAuthInit = async (
  data: Record<string, unknown>,
  from?: { origin?: string; source?: MessageEventSource | null },
) => {
  // initAuthProcess is async; let its awaits resolve so the AUTH_INIT message
  // listener is attached before we dispatch (otherwise the event is missed).
  await act(async () => {
    await Promise.resolve();
  });
  await dispatchMessage(
    { eventType: 'AUTH_INIT', redirectUri: REDIRECT_URI, ...data },
    from,
  );
};

const probe = () => screen.getByTestId('probe').textContent;

beforeEach(() => {
  // The jest config resets mock implementations before each test.
  (getDeveloperLicense as jest.Mock).mockResolvedValue({});
  (getLicenseAlias as jest.Mock).mockResolvedValue('Acme');
  (isValidDeveloperLicense as jest.Mock).mockResolvedValue(true);
  fetchOemBrandMock.mockClear();
  window.history.pushState({}, '', '/');
  mockEmbedded = false;
  mockEmbedderOrigin = null;
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
    await dispatchMessage({ eventType: 'SHARE_VEHICLES_DATA', cloudEvent: AGREEMENTS });

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

  it('OAuth return: restores cloudEvent from the saved flow', async () => {
    const flowRef = saveFlowSnapshot({ clientId: CLIENT_ID, cloudEvent: AGREEMENTS });
    const state = JSON.stringify({ provider: 'google', flowRef });
    window.history.pushState({}, '', `/?state=${encodeURIComponent(state)}`);
    renderProvider('cloudEvent');

    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe(JSON.stringify(AGREEMENTS)),
    );
  });
});

describe('DevCredentialsContext OAuth return', () => {
  const returnWith = (state: Record<string, unknown>) =>
    window.history.pushState(
      {},
      '',
      `/?code=abc&state=${encodeURIComponent(JSON.stringify(state))}`,
    );

  beforeEach(() => {
    sessionStorage.clear();
  });

  it('resumes the share flow saved before a Google sign-in (popup mode)', async () => {
    const flowRef = saveFlowSnapshot({
      clientId: CLIENT_ID,
      entryState: 'VEHICLE_MANAGER',
      permissionTemplateId: '1',
      vehicleTokenIds: ['12'],
    });
    // Popup mode: the state only knows the login fallback, no URL params.
    returnWith({
      clientId: CLIENT_ID,
      provider: 'google',
      entryState: 'EMAIL_INPUT',
      permissionTemplateId: null,
      flowRef,
    });
    renderProvider('entryState');

    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe('"VEHICLE_MANAGER"'),
    );
  });

  it('keeps the permission template from the snapshot over the empty state field', async () => {
    const flowRef = saveFlowSnapshot({ clientId: CLIENT_ID, permissionTemplateId: '1' });
    returnWith({
      clientId: CLIENT_ID,
      provider: 'apple',
      permissionTemplateId: null,
      flowRef,
    });
    renderProvider('permissionTemplateId');

    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('"1"'));
  });

  it("refuses a return whose flow this tab didn't save, and applies nothing from it", async () => {
    returnWith({
      clientId: CLIENT_ID,
      redirectUri: 'https://attacker.example/cb',
      provider: 'google',
      entryState: 'VEHICLE_MANAGER',
      flowRef: '0123456789abcdef0123456789abcdef',
    });
    renderProvider('untrustedOAuthReturn');

    await waitFor(() => expect(probe()).toBe('true'));
    expect(fetchOemBrandMock).not.toHaveBeenCalled();
  });

  it('refuses a return with no flow reference at all', async () => {
    returnWith({ clientId: CLIENT_ID, provider: 'google' });
    renderProvider('clientId');

    await waitFor(() => expect(probe()).toBe('null'));
  });

  it('Tesla: returns to CONNECT_TESLA, not the original entry state', async () => {
    const flowRef = saveFlowSnapshot({
      clientId: CLIENT_ID,
      entryState: 'VEHICLE_MANAGER',
    });
    returnWith({
      clientId: CLIENT_ID,
      provider: 'tesla',
      entryState: 'CONNECT_TESLA',
      flowRef,
    });
    renderProvider('entryState');

    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe('"CONNECT_TESLA"'),
    );
  });

  it('applies only the saved flow, not other fields of the state', async () => {
    const flowRef = saveFlowSnapshot({ clientId: CLIENT_ID });
    returnWith({
      clientId: CLIENT_ID,
      provider: 'google',
      entryState: 'EMAIL_INPUT',
      emailPermissionGranted: true,
      flowRef,
    });
    renderProvider('emailPermissionGranted');

    await waitFor(() => expect(fetchOemBrandMock).toHaveBeenCalled());
    expect(screen.getByTestId('probe').textContent).toBe('null');
  });
});

describe('DevCredentialsContext: who may configure the login', () => {
  const attacker = 'https://attacker.example';

  it("ignores a message from a window that didn't open this one", async () => {
    renderProvider();
    await dispatchAuthInit({ clientId: CLIENT_ID }, { source: null });

    await act(async () => {
      await Promise.resolve();
    });
    expect(probe()).toBe('null');
  });

  it('ignores action data before AUTH_INIT', async () => {
    renderProvider('cloudEvent');
    await act(async () => {
      await Promise.resolve();
    });
    await dispatchMessage({
      eventType: 'SHARE_VEHICLES_DATA',
      cloudEvent: [{ eventType: 'x' }],
    });

    expect(probe()).toBe('null');
  });

  it("doesn't let action data repoint the redirect URI", async () => {
    renderProvider('redirectUri');
    await dispatchAuthInit({ clientId: CLIENT_ID, entryState: 'VEHICLE_MANAGER' });
    await dispatchMessage({
      eventType: 'SHARE_VEHICLES_DATA',
      redirectUri: `${attacker}/cb`,
      permissionTemplateId: '1',
    });

    expect(probe()).toBe(JSON.stringify(REDIRECT_URI));
  });

  it('ignores messages from another origin after AUTH_INIT', async () => {
    renderProvider('permissionTemplateId');
    await dispatchAuthInit({ clientId: CLIENT_ID, entryState: 'VEHICLE_MANAGER' });
    await dispatchMessage(
      { eventType: 'SHARE_VEHICLES_DATA', permissionTemplateId: '9' },
      { origin: attacker },
    );

    expect(probe()).toBe('null');
  });

  it("refuses an opener that isn't the redirect URI's origin", async () => {
    renderProvider('untrustedCaller');
    await dispatchAuthInit({ clientId: CLIENT_ID }, { origin: attacker });

    await waitFor(() => expect(probe()).toBe('true'));
  });

  it("accepts the app's own page", async () => {
    renderProvider('invalidCredentials');
    await dispatchAuthInit({ clientId: CLIENT_ID });

    await waitFor(() => expect(probe()).toBe('false'));
  });

  it('refuses an embed under another site, even with a valid link', async () => {
    mockEmbedded = true;
    mockEmbedderOrigin = attacker;
    window.history.pushState(
      {},
      '',
      `/?clientId=${CLIENT_ID}&redirectUri=${encodeURIComponent(REDIRECT_URI)}`,
    );
    renderProvider('untrustedCaller');

    await waitFor(() => expect(probe()).toBe('true'));
  });

  it("refuses an embed when the browser doesn't say who embeds it", async () => {
    mockEmbedded = true;
    window.history.pushState(
      {},
      '',
      `/?clientId=${CLIENT_ID}&redirectUri=${encodeURIComponent(REDIRECT_URI)}`,
    );
    renderProvider('untrustedCaller');

    await waitFor(() => expect(probe()).toBe('true'));
  });

  it('accepts an embed under the app itself', async () => {
    mockEmbedded = true;
    mockEmbedderOrigin = APP_ORIGIN;
    window.history.pushState(
      {},
      '',
      `/?clientId=${CLIENT_ID}&redirectUri=${encodeURIComponent(REDIRECT_URI)}`,
    );
    renderProvider('invalidCredentials');

    await waitFor(() => expect(probe()).toBe('false'));
  });
});

describe('DevCredentialsContext: every config source is allowlisted', () => {
  it('URL params can only set known keys', async () => {
    window.history.pushState(
      {},
      '',
      `/?clientId=${CLIENT_ID}&untrustedCaller=false&injected=1`,
    );
    renderProvider('injected');

    await waitFor(() => expect(fetchOemBrandMock).toHaveBeenCalled());
    expect(probe()).toBe('null');
  });

  it("doesn't fetch a configCID that could point at another host", async () => {
    window.history.pushState({}, '', '/?configCID=evil.example%2Fx%3F');
    renderProvider();

    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchConfigFromIPFS).not.toHaveBeenCalled();
  });

  it('a console configuration can only set known keys', async () => {
    (getConfigurationById as jest.Mock).mockResolvedValue({
      client_id: CLIENT_ID,
      configuration: {
        redirectUri: REDIRECT_URI,
        invalidCredentials: false,
        injected: 1,
      },
    });
    window.history.pushState({}, '', '/?configurationId=cfg-1');
    renderProvider('injected');

    await waitFor(() => expect(fetchOemBrandMock).toHaveBeenCalled());
    expect(probe()).toBe('null');
  });

  it("keeps the SDK's dimoState from a redirect", async () => {
    window.history.pushState(
      {},
      '',
      `/?clientId=${CLIENT_ID}&dimoState=abcdefABCDEF0123456789_-`,
    );
    renderProvider('dimoState');

    await waitFor(() => expect(probe()).toBe('"abcdefABCDEF0123456789_-"'));
  });
});
