/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
let mockEmbedded = false;
vi.mock('../../utils/isEmbed', () => ({ isEmbed: () => mockEmbedded }));

import { getValidationsForState } from '..';
import type { AllParams } from '../../types';

const errorFor = () =>
  Object.values(getValidationsForState('CONNECTED_APPS'))
    .map((validate) => validate({} as AllParams))
    .find((result) => !result.isValid)?.error;

beforeEach(() => {
  mockEmbedded = false;
});

it('refuses connected apps embedded, before anyone signs in', () => {
  mockEmbedded = true;
  expect(errorFor()).toEqual({
    title: expect.objectContaining({ key: 'apps.title' }),
    message: expect.objectContaining({ key: 'apps.embedded' }),
  });
});

it('lets connected apps open in a popup or a tab', () => {
  expect(errorFor()).toBeUndefined();
});
