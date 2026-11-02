import { sendAuthPayloadToParent } from '../authUtils';
import { backToThirdParty, sendMessageToReferrer, setAppState } from '../messageHandler';
import { saveFlowSnapshot } from '../flowSnapshot';
import { sendSignatureResponseToParent, sendTxnResponseToParent } from '../txnUtils';

// authUtils pulls in the Turnkey / kernel-signer stack (ESM-only under jest; jest hoists these above the imports); only the postMessage path is under test.
vi.mock('../../services/authService', () => ({}));
vi.mock('../../services/turnkeyService', () => ({}));
vi.mock('../../services/storageService', () => ({}));

// The login opened in a popup with the given referrer and `state` query param.
function openedBy(referrer: string, state?: object) {
  const postMessage = vi.fn();
  Object.defineProperty(window, 'opener', { value: { postMessage }, configurable: true });
  Object.defineProperty(document, 'referrer', { value: referrer, configurable: true });
  window.history.replaceState(
    null,
    '',
    state ? `/?state=${encodeURIComponent(JSON.stringify(state))}` : '/',
  );
  return postMessage;
}

const REGISTERED = 'https://app.example.com/callback';
const payload = { token: 'jwt', walletAddress: '0xabc' };

afterEach(() => {
  Object.defineProperty(window, 'opener', { value: null, configurable: true });
  vi.restoreAllMocks();
});

describe('messages carrying the user token', () => {
  it('are addressed to the registered redirectUri origin, not the referrer', () => {
    const postMessage = openedBy('https://other.example/');
    sendAuthPayloadToParent(payload, REGISTERED, () => undefined);
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'authResponse', token: 'jwt' }),
      'https://app.example.com',
    );
  });

  it('ignore state.referrer', () => {
    const postMessage = openedBy('https://other.example/', {
      referrer: 'https://other.example',
    });
    sendTxnResponseToParent('0xhash', 'jwt', REGISTERED, () => undefined);
    sendSignatureResponseToParent(
      '0xsig',
      '0xsigner',
      'jwt',
      REGISTERED,
      () => undefined,
    );
    for (const [, target] of postMessage.mock.calls)
      expect(target).toBe('https://app.example.com');
    expect(postMessage).toHaveBeenCalledTimes(2);
  });

  it('never fall back to the referrer when the redirect URI is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const postMessage = openedBy('https://other.example/');
    sendAuthPayloadToParent(payload, '', () => undefined);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('are not sent at all when the redirectUri has no web origin', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const postMessage = openedBy('https://other.example/');
    sendAuthPayloadToParent(payload, 'myapp://callback', () => undefined);
    expect(postMessage).not.toHaveBeenCalled();
  });
});

it('non-sensitive notices still go to the referrer origin', () => {
  const postMessage = openedBy('https://app.example.com/page');
  sendMessageToReferrer({ eventType: 'READY' });
  expect(postMessage).toHaveBeenCalledWith(
    expect.objectContaining({ eventType: 'READY' }),
    'https://app.example.com',
  );
});

describe('after an OAuth round-trip', () => {
  it("notices go to the referrer saved in this tab's state", () => {
    const flowRef = saveFlowSnapshot({ entryState: 'EMAIL_INPUT' });
    const postMessage = openedBy('https://accounts.google.com/', {
      referrer: 'https://app.example.com/page',
      flowRef,
    });
    sendMessageToReferrer({ eventType: 'READY' });
    expect(postMessage).toHaveBeenCalledWith(
      expect.anything(),
      'https://app.example.com',
    );
  });

  it("ignore a referrer in a state this tab didn't send", () => {
    const postMessage = openedBy('https://accounts.google.com/', {
      referrer: 'https://attacker.example/',
      flowRef: '0123456789abcdef0123456789abcdef',
    });
    sendMessageToReferrer({ eventType: 'READY' });
    expect(postMessage).toHaveBeenCalledWith(
      expect.anything(),
      'https://accounts.google.com',
    );
  });
});

describe('redirect back to the app', () => {
  const realLocation = window.location;
  let assigned = '';

  beforeEach(() => {
    assigned = '';
    // jsdom can't navigate; capture where the redirect would go.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...realLocation,
        set href(url: string) {
          assigned = url;
        },
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: realLocation,
    });
  });

  it('leaves out values that are missing instead of sending "undefined"', () => {
    backToThirdParty(
      { token: 'jwt', walletAddress: '0xabc', email: undefined },
      REGISTERED,
      '',
    );
    const params = new URL(assigned).searchParams;
    expect(params.get('token')).toBe('jwt');
    expect(params.has('email')).toBe(false);
  });

  it("returns the SDK's dimoState so the app knows it asked", () => {
    setAppState('abcdefABCDEF0123456789');
    backToThirdParty({ token: 'jwt' }, REGISTERED, '');
    setAppState(undefined);
    expect(new URL(assigned).searchParams.get('dimoState')).toBe(
      'abcdefABCDEF0123456789',
    );
  });

  it('sends the email when it was shared', () => {
    backToThirdParty(
      { token: 'jwt', walletAddress: '0xabc', email: 'jun@example.com' },
      REGISTERED,
      '',
    );
    expect(new URL(assigned).searchParams.get('email')).toBe('jun@example.com');
  });
});
