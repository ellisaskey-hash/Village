import { type ReactNode, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { pressable } from '@/lib/motion';
import { Icon } from './Icon';

interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Glass row treatment for use inside sheets (fix #7 — one row primitive, `surface` prop). */
  surface?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * The single row primitive (Elevra fix #7). Avatar/icon + title + subtitle + trailing.
 * A `surface` row swaps to the glass row tokens so it sits correctly inside a Sheet.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  surface = false,
  onClick,
  className,
}: ListRowProps) {
  const base = cx(
    'flex w-full items-center gap-3 rounded-lg border px-cardPad py-3 text-left transition-colors',
    surface
      ? 'border-[var(--c-glass-row-border)] bg-[var(--c-glass-row-bg)]'
      : 'border-border bg-bgElevated',
  );

  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-text">{title}</span>
        {subtitle && <span className="block truncate text-small text-textMuted">{subtitle}</span>}
      </span>
      {trailing ? (
        <span className="shrink-0">{trailing}</span>
      ) : onClick ? (
        <Icon name="chevron-right" size={18} className="shrink-0 text-textFaint" />
      ) : null}
    </>
  );

  if (onClick) {
    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    };
    return (
      <motion.button
        type="button"
        onClick={onClick}
        onKeyDown={onKeyDown}
        whileTap={pressable.whileTap}
        transition={pressable.transition}
        className={cx(
          base,
          surface ? 'hover:bg-[var(--c-glass-row-bg-hover)]' : 'hover:bg-surfaceHover',
          className,
        )}
      >
        {body}
      </motion.button>
    );
  }

  return <div className={cx(base, className)}>{body}</div>;
}
