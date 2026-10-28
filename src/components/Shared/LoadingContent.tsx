import React from 'react';

import { Loader, LoaderProps } from '../';

export type LoadingContentProps = LoaderProps;

// The logo sits in AppShell's top bar, which only shows an OEM logo once it's
// known, so an OEM popup never flashes the DIMO mark while loading.
export const LoadingContent: React.FC<LoadingContentProps> = ({ message }) => (
  <Loader message={message} />
);
