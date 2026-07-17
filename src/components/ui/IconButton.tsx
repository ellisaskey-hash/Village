import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { pressable } from '@/lib/motion';
import { Icon, type IconName } from './Icon';
import type { NativeButtonProps } from './primitiveProps';

type Size = 'sm' | 'md' | 'lg';

interface IconButtonProps extends Omit<NativeButtonProps, 'aria-label'> {
  icon: IconName;
  /** Required — an icon-only control has no visible text (COMPONENT_INVENTORY 1.2). */
  ariaLabel: string;
  variant?: 'ghost' | 'surface' | 'primary';
  showBadge?: boolean;
  size?: Size;
}

const BOX: Record<Size, string> = { sm: 'h-8 w-8', md: 'h-11 w-11', lg: 'h-12 w-12' };
const GLYPH: Record<Size, number> = { sm: 18, md: 20, lg: 24 };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, ariaLabel, variant = 'ghost', showBadge = false, size = 'md', disabled, className, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      whileTap={pressable.whileTap}
      transition={pressable.transition}
      className={cx(
        'relative inline-flex items-center justify-center rounded-full transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        // sm keeps a 44px hit area via an invisible expanded ::after
        size === 'sm' && "after:absolute after:-inset-1.5 after:content-['']",
        variant === 'primary'
          ? 'bg-brand text-textOnAccent shadow-glowAccent hover:opacity-90'
          : variant === 'surface'
            ? 'bg-surface text-text hover:bg-surfaceHover hover:text-accent'
            : 'text-text hover:bg-surface hover:text-accent',
        BOX[size],
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={GLYPH[size]} />
      {showBadge && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-bg" />
      )}
    </motion.button>
  );
});
