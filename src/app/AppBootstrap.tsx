import { type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useApplyTheme } from '@/app/state/theme';
import { useApplyA11y } from '@/app/state/a11y';
import { useBootstrapSession } from '@/app/state/session';
import { AppBackground } from '@/components/decor/AppBackground';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { MockBanner } from '@/components/layout/MockBanner';
import { UpdatePrompt } from '@/components/layout/UpdatePrompt';
import { OfflinePill, ToastProvider } from '@/components/ui';
import { ServicesProvider, useServices } from '@/lib/services/provider';

/**
 * Root providers: theming + a11y apply-hooks, reduced-motion MotionConfig, the data-layer
 * (ServicesProvider selects mock vs Supabase and wraps TanStack Query), the hearth ambient,
 * the toast host, and the session bootstrap.
 */
export function AppBootstrap({ children }: { children: ReactNode }) {
  useApplyTheme();
  useApplyA11y();
  return (
    <MotionConfig reducedMotion="user">
      <ServicesProvider>
        <Inner>{children}</Inner>
      </ServicesProvider>
    </MotionConfig>
  );
}

function Inner({ children }: { children: ReactNode }) {
  useBootstrapSession();
  const { isMock } = useServices();
  const pathname = useLocation().pathname;
  const onDevRoute = pathname.startsWith('/dev');
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <AppBackground />
      <OfflinePill />
      <ToastProvider>
        <UpdatePrompt />
        <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
      </ToastProvider>
      {isMock && !onDevRoute && <MockBanner />}
    </>
  );
}
