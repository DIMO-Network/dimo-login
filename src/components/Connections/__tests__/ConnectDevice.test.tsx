/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { act, render, screen } from '@testing-library/react';

let mockComponentData: unknown = null;
jest.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => ({ componentData: mockComponentData, goBack: jest.fn() }),
}));
jest.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    devLicenseAlias: 'Hanami Insurance',
    redirectUri: 'https://hanami-insurance.example/callback',
  }),
}));

import { ConnectDevice } from '../ConnectDevice';
import { changeLanguage } from '../../../i18n';

afterEach(async () => {
  await act(async () => {
    await changeLanguage('en');
  });
});

it('names the vehicle the compatibility check found', () => {
  // What CompatibilityCheck leaves in componentData before Add this vehicle.
  mockComponentData = {
    vehicleToAdd: { make: 'Ford', model: 'Bronco', year: 2021, vin: '1FMEE5DP5MLA00000' },
  };
  render(<ConnectDevice />);
  expect(
    screen.getByRole('heading', { name: 'Connect your 2021 Ford Bronco' }),
  ).toBeInTheDocument();
});

it('names it in Japanese too', async () => {
  mockComponentData = { vehicleToAdd: { make: 'Ford', model: 'Bronco', year: 2021 } };
  await act(async () => {
    await changeLanguage('ja');
  });
  render(<ConnectDevice />);
  expect(
    screen.getByRole('heading', { name: '2021 Ford Broncoを接続' }),
  ).toBeInTheDocument();
});

it('falls back to the make, model and year typed on Add a vehicle', () => {
  mockComponentData = { makeModel: 'Ford Bronco', modelYear: 2021 };
  render(<ConnectDevice />);
  expect(
    screen.getByRole('heading', { name: 'Connect your 2021 Ford Bronco' }),
  ).toBeInTheDocument();
});
