import { type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { springSnappy } from '@/lib/motion';
import type { NativeDivProps } from './primitiveProps';

interface CardProps extends NativeDivProps {
  variant?: 'default' | 'featured' | 'pressable';
  onClick?: () => void;
}

/** Frosted surface card (COMPONENT_INVENTORY 4.1). `featured` adds an accent glow;
 *  `pressable` makes the whole card interactive (hover lift + press scale). */
export function Card({ variant = 'default', onClick, className, children, ...rest }: CardProps) {
  const base = 'rounded-lg border bg-bgElevated p-cardPad';

  if (variant === 'pressable') {
    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    };
    return (
      <motion.div
        className={cx(
          base,
          'cursor-pointer border-border shadow-card transition-shadow hover:shadow-raised',
          className,
        )}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        transition={springSnappy}
        {...(onClick
          ? { role: 'button', tabIndex: 0, onClick, onKeyDown }
          : {})}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={cx(
        base,
        variant === 'featured'
          ? 'border-accent/30 shadow-glowAccent'
          : 'border-border shadow-card',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
