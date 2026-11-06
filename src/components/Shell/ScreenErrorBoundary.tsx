import React, { Component, type ReactNode, type RefObject } from 'react';
import { captureException } from '@sentry/react';

import { message } from '../../i18n';
import {
  ChunkLoadError,
  reloadPage,
  shouldReloadForMissingChunk,
} from '../../utils/chunkReload';
import { ErrorScreen } from '../Shared/ErrorScreen';
import { LoadingScreen } from '../Shared/LoadingScreen';
import { FocusScreenHeading } from './FocusScreenHeading';

interface ScreenErrorBoundaryProps {
  children: ReactNode;
  /** Shared with FocusScreenHeading: the error copy takes focus as a screen does. */
  firstScreen: RefObject<object | null>;
}

interface ScreenErrorBoundaryState {
  /** A chunk is missing and the page may reload: show the loading screen. */
  reloading: boolean;
  failed: boolean;
}

// Reading sessionStorage throws where storage is blocked: then don't reload.
const reloadAllowed = (): boolean => {
  try {
    return shouldReloadForMissingChunk({
      storage: sessionStorage,
      now: Date.now(),
      timeOrigin: performance.timeOrigin,
    });
  } catch {
    return false;
  }
};

/**
 * Catches a screen that couldn't show. A lazy screen whose chunk is missing
 * (most often a deploy replaced it) reloads the page once to pick up the new
 * build. If it's still missing, or the screen broke some other way, the
 * boundary says so inside the shell instead of leaving the popup blank.
 */
export class ScreenErrorBoundary extends Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  state: ScreenErrorBoundaryState = { reloading: false, failed: false };

  static getDerivedStateFromError(error: unknown): ScreenErrorBoundaryState {
    // Whether to reload is decided once, in componentDidCatch; until then a
    // missing chunk shows the loading screen.
    const missingChunk = error instanceof ChunkLoadError;
    return { reloading: missingChunk, failed: !missingChunk };
  }

  componentDidCatch(error: unknown) {
    if (error instanceof ChunkLoadError && reloadAllowed()) {
      reloadPage();
      return;
    }
    this.setState({ reloading: false, failed: true });
    captureException(error);
    // Not reloading: let the screen fetch again the next time it's shown.
    if (error instanceof ChunkLoadError) error.retry?.();
  }

  render() {
    if (this.state.reloading) return <LoadingScreen />;
    if (this.state.failed) {
      return (
        <>
          <ErrorScreen
            title={message('error.screen_load.title')}
            message={message('error.screen_load.message')}
          />
          <FocusScreenHeading firstScreen={this.props.firstScreen} />
        </>
      );
    }
    return this.props.children;
  }
}
