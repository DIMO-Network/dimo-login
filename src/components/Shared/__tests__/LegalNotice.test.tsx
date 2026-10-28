/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { render, screen } from '@testing-library/react';

const mockCreds: Record<string, unknown> = {};
jest.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({ devLicenseAlias: 'Hanami Insurance', ...mockCreds }),
}));

import { LegalNotice } from '../LegalNotice';

beforeEach(() => Object.keys(mockCreds).forEach((key) => delete mockCreds[key]));

describe('LegalNotice', () => {
  it("names the app only on the app's own documents", () => {
    mockCreds.tosUrl = 'https://hanami.example/terms';
    mockCreds.privacyPolicyUrl = 'https://hanami.example/privacy';
    render(<LegalNotice />);
    expect(screen.getByText(/Hanami Insurance’s/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
      'href',
      'https://hanami.example/terms',
    );
  });

  it("doesn't call DIMO's documents the app's", () => {
    render(<LegalNotice />);
    expect(screen.queryByText(/Hanami Insurance’s/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      'https://dimo.org/legal/privacy-policy',
    );
  });

  it('says who runs the sign-in under an OEM brand', () => {
    mockCreds.oemBrand = { name: 'Hanami' };
    render(<LegalNotice />);
    expect(screen.getByText('Powered by DIMO')).toBeInTheDocument();
  });
});
