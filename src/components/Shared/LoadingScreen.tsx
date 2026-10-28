import React from 'react';

import { LoadingContent, LoadingContentProps } from './LoadingContent';

/** Rendered inside AppShell (App.tsx), which provides the frame. */
export const LoadingScreen: React.FC<LoadingContentProps> = ({ message }) => (
  <LoadingContent message={message} />
);

export default LoadingScreen;
