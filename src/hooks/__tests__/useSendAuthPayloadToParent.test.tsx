/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import { renderHook } from '@testing-library/react';

const mockAuth = vi.hoisted(() => ({
  jwt: '',
  user: {
    email: 'alice@x.co',
    subOrganizationId: 'sub-a',
    smartContractAddress: '0xalice-sca',
  },
  switchAccount: vi.fn(),
}));
vi.mock('../../context/AuthContext', () => ({ useAuthContext: () => mockAuth }));
vi.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({ clientId: '0xc', redirectUri: 'https://app.example/cb' }),
}));
const mockPost = vi.fn();
vi.mock('../../utils/messageHandler', () => ({
  sendMessageToReferrer: (...args: unknown[]) => mockPost(...args),
  backToThirdParty: vi.fn(),
}));

import { useSendAuthPayloadToParent } from '../useSendAuthPayloadToParent';

const b64 = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
const tokenExpiringIn = (seconds: number) =>
  `${b64({ alg: 'none' })}.${b64({ exp: Math.floor(Date.now() / 1000) + seconds })}.sig`;

beforeEach(() => localStorage.clear());

it('tells the app with this tab’s token', () => {
  mockAuth.jwt = tokenExpiringIn(3600);
  const onSuccess = vi.fn();
  const { result } = renderHook(() => useSendAuthPayloadToParent());
  result.current({ sharedVehicles: ['7'] }, onSuccess);

  expect(mockPost).toHaveBeenCalledWith(
    expect.objectContaining({ token: mockAuth.jwt, sharedVehicles: ['7'] }),
    'https://app.example/cb',
  );
  expect(onSuccess).toHaveBeenCalled();
  expect(mockAuth.switchAccount).not.toHaveBeenCalled();
});

it('signs in again instead of sending a token that has run out', () => {
  mockAuth.jwt = tokenExpiringIn(-60);
  const onSuccess = vi.fn();
  const { result } = renderHook(() => useSendAuthPayloadToParent());
  result.current({ sharedVehicles: ['7'] }, onSuccess);

  expect(mockPost).not.toHaveBeenCalled();
  expect(onSuccess).not.toHaveBeenCalled();
  expect(mockAuth.switchAccount).toHaveBeenCalledTimes(1);
});
