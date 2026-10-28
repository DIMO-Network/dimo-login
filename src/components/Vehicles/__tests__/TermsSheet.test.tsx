/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

// The package ships ESM only; the sheet needs none of it here.
jest.mock('@dimo-network/transactions', () => ({
  Permission: {},
  getPermissionsArray: () => [],
}));

import { TermsSheet } from '../TermsSheet';
import { changeLanguage } from '../../../i18n';

const contract = (language?: string) =>
  language === 'en' ? 'This contract gives permission…' : 'この契約は…';

afterEach(async () => {
  await act(async () => {
    await changeLanguage('en');
  });
});

it('labels the translation and the English original for what each is', async () => {
  await act(async () => {
    await changeLanguage('ja');
  });
  render(
    <TermsSheet
      open
      onClose={jest.fn()}
      items={[]}
      end={{ noEnd: true, date: new Date('2077-01-01T00:00:00Z') }}
      contract={contract}
    />,
  );
  expect(screen.getByText('これは英語の原文の参考訳です。')).toBeInTheDocument();
  expect(screen.getByText('この契約は…')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '英語で表示' }));

  expect(screen.getByText('これは英語の原文です。')).toBeInTheDocument();
  expect(screen.queryByText('これは英語の原文の参考訳です。')).not.toBeInTheDocument();
  expect(screen.getByText('This contract gives permission…')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '日本語で表示' })).toBeInTheDocument();
});
