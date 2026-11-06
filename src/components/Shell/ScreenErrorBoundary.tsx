import React, { Component, type ReactNode } from 'react';
import { captureException } from '@sentry/react';

import { message } from '../../i18n';
import { ErrorScreen } from '../Shared/ErrorScreen';

interface ScreenErrorBoundaryProps {
  children: ReactNode;
}

interface ScreenErrorBoundaryState {
  failed: boolean;
}

/**
 * Catches a screen that couldn't render, most often a lazy screen whose chunk
 * didn't load even after the reload in chunkReload.ts, and says so inside the
 * shell instead of leaving the popup blank.
 */
export class ScreenErrorBoundary extends Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  state: ScreenErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ScreenErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    captureException(error);
  }

  render() {
    if (this.state.failed) {
      return (
        <ErrorScreen
          title={message('error.screen_load.title')}
          message={message('error.screen_load.message')}
        />
      );
    }
    return this.props.children;
  }
}
