import { type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useApplyTheme } from '@/app/state/theme';
import { useApplyA11y } from '@/app/state/a11y';
import { useBootstrapSession } from '@/app/state/session';
import { AppBackground } from '@/components/decor/AppBackground';
import { MockBanner } from '@/components/layout/MockBanner';
import { ToastProvider } from '@/components/ui';
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
  const onDevRoute = useLocation().pathname.startsWith('/dev');
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <AppBackground />
      <ToastProvider>{children}</ToastProvider>
      {isMock && !onDevRoute && <MockBanner />}
    </>
  );
}
