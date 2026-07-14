import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { BrandLogo } from '@/components/ui';

/** Centred card layout for the onboarding / auth flow (scaffold C, spec 07). */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <motion.main
      id="main"
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-screenX py-10"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandLogo size={48} />
        <div className="space-y-1">
          <h1 className="font-display text-h1 font-bold text-text">{title}</h1>
          {subtitle && <p className="text-body text-textMuted">{subtitle}</p>}
        </div>
      </div>
      {children}
      {footer && <div className="text-center text-small text-textMuted">{footer}</div>}
    </motion.main>
  );
}
