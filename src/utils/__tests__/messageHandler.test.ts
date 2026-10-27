import { sendAuthPayloadToParent } from '../authUtils';
import { backToThirdParty, sendMessageToReferrer } from '../messageHandler';
import { sendSignatureResponseToParent, sendTxnResponseToParent } from '../txnUtils';

// authUtils pulls in the Turnkey / kernel-signer stack (ESM-only under jest; jest hoists these above the imports); only the postMessage path is under test.
jest.mock('../../services/authService', () => ({}));
jest.mock('../../services/turnkeyService', () => ({}));
jest.mock('../../services/storageService', () => ({}));

// The login opened in a popup with the given referrer and `state` query param.
function openedBy(referrer: string, state?: object) {
  const postMessage = jest.fn();
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
  jest.restoreAllMocks();
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

  it('are not sent at all when the redirectUri has no web origin', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
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

  it('sends the email when it was shared', () => {
    backToThirdParty(
      { token: 'jwt', walletAddress: '0xabc', email: 'jun@example.com' },
      REGISTERED,
      '',
    );
    expect(new URL(assigned).searchParams.get('email')).toBe('jun@example.com');
  });
});
