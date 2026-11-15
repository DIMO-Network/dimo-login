/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: '0xc',
    devLicenseAlias: 'Toyota',
    redirectUri: 'https://app.example/cb',
    utm: '',
  }),
}));
const mockSwitch = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ jwt: 'jwt', user: {}, switchAccount: mockSwitch }),
}));
const mockBuild = vi.fn();
vi.mock('../../../utils/authUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/authUtils')>()),
  buildAuthPayload: (...args: unknown[]) => mockBuild(...args),
}));
const mockBack = vi.fn();
vi.mock('../../../utils/messageHandler', () => ({
  backToThirdParty: (...args: unknown[]) => mockBack(...args),
}));
vi.mock('../../../utils/isEmbed', () => ({ isEmbed: () => false }));

import { AccountPermissionsSuccess } from '../AccountPermissionsSuccess';
import { TOKEN_EXPIRED_ERROR } from '../../../utils/authUtils';

beforeEach(() => {
  mockBuild.mockReturnValue({ token: 'jwt', walletAddress: '0xabc' });
});

it('goes back to the app with the grant', () => {
  render(<AccountPermissionsSuccess />);
  fireEvent.click(screen.getByRole('button', { name: 'Back to Toyota' }));
  expect(mockBack).toHaveBeenCalledWith(
    { token: 'jwt', walletAddress: '0xabc', accountGranted: true },
    'https://app.example/cb',
    '',
  );
});

it('signs in again instead of going back with a token that has run out', () => {
  mockBuild.mockImplementation(() => {
    throw new Error(TOKEN_EXPIRED_ERROR);
  });
  render(<AccountPermissionsSuccess />);
  fireEvent.click(screen.getByRole('button', { name: 'Back to Toyota' }));

  expect(mockBack).not.toHaveBeenCalled();
  expect(mockSwitch).toHaveBeenCalledTimes(1);
});
