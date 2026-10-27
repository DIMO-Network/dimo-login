import { AuthProvider, constructAuthUrl } from '../authUrls';

// The auth host comes from env, unset under jest, so read `state` off the query.
const stateOf = (url: string) =>
  JSON.parse(decodeURIComponent(new URLSearchParams(url.split('?')[1]).get('state')!));

describe('constructAuthUrl state', () => {
  it('carries the document request and powertrain filter through OAuth', () => {
    const cloudEvent = [
      { eventType: 'dimo.document.vehicle.*', ids: [], tags: ['documents'] },
    ];
    const url = constructAuthUrl({
      provider: AuthProvider.GOOGLE,
      clientId: '0xb92d74B468B4047289AEa7c9B953066E39768C16',
      redirectUri: 'https://app.example.com',
      powertrainTypes: ['BEV'],
      cloudEvent,
    });

    const state = stateOf(url);
    expect(state.cloudEvent).toEqual(cloudEvent);
    expect(state.powertrainTypes).toEqual(['BEV']);
  });

  it('carries how the app wants the screens, for when storage is blocked', () => {
    const state = stateOf(
      constructAuthUrl({
        provider: AuthProvider.APPLE,
        clientId: '0xb92d74B468B4047289AEa7c9B953066E39768C16',
        redirectUri: 'https://app.example.com',
        emailRequest: 'required',
        forceEmail: true,
        language: 'ja',
        brandName: 'Hanami',
        tosUrl: 'https://app.example.com/terms',
        privacyPolicyUrl: 'https://app.example.com/privacy',
      }),
    );
    expect(state).toMatchObject({
      emailRequest: 'required',
      forceEmail: true,
      language: 'ja',
      brandName: 'Hanami',
      tosUrl: 'https://app.example.com/terms',
      privacyPolicyUrl: 'https://app.example.com/privacy',
    });
  });
});
