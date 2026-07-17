import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { pressable } from '@/lib/motion';
import { Icon, type IconName } from './Icon';
import { badgeBg, badgeFg, type Tone } from './tones';
import type { NativeButtonProps } from './primitiveProps';

interface ChipProps extends NativeButtonProps {
  tone?: Tone;
  selected?: boolean;
  variant?: 'tint' | 'solid';
  leadingIcon?: IconName;
}

/**
 * Canonical pill for filters, tags, time-slots. Height locked at 44px (Elevra fix #4)
 * so the touch target is generous even though the pill reads small.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { tone = 'accent', selected = false, variant = 'tint', leadingIcon, className, children, ...rest },
  ref,
) {
  const selectedClasses =
    variant === 'solid'
      ? 'bg-accent text-textOnAccent border-transparent shadow-glowAccent'
      : cx(badgeBg[tone], badgeFg[tone], 'border-transparent');

  return (
    <motion.button
      ref={ref}
      type="button"
      aria-pressed={selected}
      whileTap={pressable.whileTap}
      transition={pressable.transition}
      className={cx(
        'inline-flex h-11 select-none items-center gap-1.5 rounded-pill border px-3 text-small font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        selected
          ? selectedClasses
          : 'border-border bg-surface text-textMuted hover:border-borderStrong hover:text-text',
        className,
      )}
      {...rest}
    >
      {leadingIcon && <Icon name={leadingIcon} size={14} />}
      {children}
    </motion.button>
  );
});
