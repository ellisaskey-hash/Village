import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { springSnappy } from '@/lib/motion';
import { IconBadge } from './IconBadge';
import { type IconName } from './Icon';
import { type Tone } from './tones';

interface StatCardProps {
  icon: IconName;
  tone?: Tone;
  eyebrow: string;
  value: ReactNode;
  footer?: ReactNode;
  valueGradient?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Home stat tile (COMPONENT_INVENTORY 4.4). Icon badge + eyebrow + big value + footer. */
export function StatCard({
  icon,
  tone = 'accent',
  eyebrow,
  value,
  footer,
  valueGradient = false,
  onClick,
  className,
}: StatCardProps) {
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <IconBadge icon={icon} tone={tone} size="sm" />
        <span className="text-eyebrow uppercase text-textMuted">{eyebrow}</span>
      </div>
      <div
        className={cx(
          'tabular font-display text-h1 leading-none',
          valueGradient
            ? 'bg-brand bg-clip-text text-transparent'
            : 'text-text',
        )}
      >
        {value}
      </div>
      {footer && <div className="text-small text-textMuted">{footer}</div>}
    </>
  );

  const base = 'flex flex-col gap-3 rounded-lg border border-border bg-bgElevated p-cardPad shadow-card';

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={springSnappy}
        className={cx(base, 'text-left transition-colors hover:border-accent/40', className)}
      >
        {inner}
      </motion.button>
    );
  }
  return <div className={cx(base, className)}>{inner}</div>;
}
