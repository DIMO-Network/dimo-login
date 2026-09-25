import React from 'react';
import { render, screen } from '@testing-library/react';

import { ContractDescription } from '../ContractDescription';

const PAYLOAD = '<img src=https://x onerror="window.__pwned=1">';
const ATTACHMENT =
  'https://assets.dimo.org/ipfs/QmPP5QCh662B4nW8nUcJLby7NKXuKy61mKwUmvXhxTrW6B';

const renderContract = (description: string, isExpanded = true) =>
  render(<ContractDescription description={description} isExpanded={isExpanded} />);

it('renders app-supplied text as text, never as HTML', () => {
  // The shape that reached dangerouslySetInnerHTML before: a bulleted
  // paragraph that also contains "http".
  renderContract(`Intro.\n\nFiles Requested: \n- ${PAYLOAD}\n\n- Grantee: ${PAYLOAD}`);

  expect(screen.queryByRole('img')).toBeNull();
  expect((window as any).__pwned).toBeUndefined();
  expect(screen.getByText(PAYLOAD)).toBeInTheDocument();
});

it('renders the policy attachment DIMO adds as a real link', () => {
  renderContract(
    `Intro.\n\n<a href="${ATTACHMENT}" target="_blank">Contract Attachment</a>`,
  );

  const link = screen.getByRole('link', { name: 'Contract Attachment' });
  expect(link).toHaveAttribute('href', ATTACHMENT);
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

it('does not turn look-alike anchors into links', () => {
  renderContract(
    'Intro.\n\n<a href="https://evil.example/ipfs/Qm1" target="_blank">Contract Attachment</a>',
  );
  expect(screen.queryByRole('link')).toBeNull();
});

it("does not link to other files on DIMO's gateway", () => {
  // e.g. injected through a license alias pointing at an attacker's upload
  renderContract(
    'Intro.\n\n<a href="https://assets.dimo.org/ipfs/QmAttackerUpload" target="_blank">Contract Attachment</a>',
  );
  expect(screen.queryByRole('link')).toBeNull();
});

it('shows only the first paragraph until expanded', () => {
  renderContract('First.\n\nSecond.', false);
  expect(screen.getByText('First.')).toBeInTheDocument();
  expect(screen.queryByText('Second.')).toBeNull();
});
