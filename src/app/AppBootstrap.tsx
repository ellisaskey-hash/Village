import { type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useApplyTheme } from '@/app/state/theme';
import { useApplyA11y } from '@/app/state/a11y';
import { AppBackground } from '@/components/decor/AppBackground';
import { ToastProvider } from '@/components/ui';

/**
 * Mounts the theming + accessibility apply-hooks once at the root, wraps the tree in a
 * MotionConfig honouring the user's reduced-motion preference (layer 2 of the reduced-motion
 * triple), paints the hearth ambient behind everything, and provides the toast host.
 */
export function AppBootstrap({ children }: { children: ReactNode }) {
  useApplyTheme();
  useApplyA11y();
  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <AppBackground />
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  );
}
