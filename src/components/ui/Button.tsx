import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { pressable } from '@/lib/motion';
import { Icon, type IconName } from './Icon';
import type { NativeButtonProps } from './primitiveProps';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'pill';
type Size = 'sm' | 'xl';

interface ButtonProps extends NativeButtonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-textOnAccent shadow-glowAccent font-display font-semibold',
  secondary: 'bg-surface border border-borderStrong text-text hover:bg-surfaceHover',
  ghost: 'bg-transparent text-text hover:bg-surface',
  danger: 'bg-danger text-textOnAccent hover:brightness-105',
  pill: 'bg-surface border border-border text-text rounded-pill hover:bg-surfaceHover',
};

const SIZE: Record<Size, string> = {
  sm: 'h-[32px] px-3 text-small',
  xl: 'h-[52px] md:h-[44px] px-5 text-body',
};

/**
 * The universal button (COMPONENT_INVENTORY 1.1). Two-size canon: sm for inline / card
 * actions, xl for drawer-footer saves. Full-width sm buttons grow to 52px on phones so
 * touch stays generous.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'sm',
    loading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={isDisabled}
      aria-busy={loading}
      // disabled buttons are pointer-events-none, so whileTap never fires
      whileTap={pressable.whileTap}
      transition={pressable.transition}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        fullWidth && size === 'sm' && 'max-md:h-[52px]',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Icon name="loader" size={16} className="animate-spin" />
      ) : (
        leadingIcon && <Icon name={leadingIcon} size={16} />
      )}
      {children}
      {trailingIcon && !loading && <Icon name={trailingIcon} size={16} />}
    </motion.button>
  );
});
