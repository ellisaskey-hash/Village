import * as Sentry from '@sentry/react';

/**
 * Sentry from M0 (Elevra fix #31, non-negotiable). No-ops without a DSN so local dev
 * and the gallery run clean. Only VITE_-prefixed vars reach the client bundle (spec 09).
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
