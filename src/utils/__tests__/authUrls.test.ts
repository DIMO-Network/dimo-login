import { AuthProvider, constructAuthUrl } from '../authUrls';

// The auth host comes from env, unset under jest, so read `state` off the query.
const stateOf = (url: string) =>
  JSON.parse(decodeURIComponent(new URLSearchParams(url.split('?')[1]).get('state')!));

describe('constructAuthUrl state', () => {
  it('carries only the flow reference and where to come back to', () => {
    const state = stateOf(
      constructAuthUrl({
        provider: AuthProvider.GOOGLE,
        flowRef: '0123456789abcdef0123456789abcdef',
        referrer: 'https://app.example.com/page',
      }),
    );
    // The flow itself (documents, filters, email and language settings) is in
    // the snapshot the reference names; a return without it isn't trusted.
    expect(state).toEqual({
      provider: 'google',
      flowRef: '0123456789abcdef0123456789abcdef',
      referrer: 'https://app.example.com/page',
    });
  });

  it('Tesla names the step to come back to', () => {
    const state = stateOf(
      constructAuthUrl({
        provider: AuthProvider.TESLA,
        flowRef: '0123456789abcdef0123456789abcdef',
        entryState: 'CONNECT_TESLA',
      }),
    );
    expect(state).toMatchObject({ provider: 'tesla', entryState: 'CONNECT_TESLA' });
  });
});
