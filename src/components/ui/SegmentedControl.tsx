import { useId } from 'react';
import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { springSnappy } from '@/lib/motion';
import { useArrowNavigation } from '@/lib/useArrowNavigation';

interface Option<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Mutually-exclusive options; the active pill slides between segments via `layoutId`
 * (COMPONENT_INVENTORY 2.11). Arrow-key navigable; the layoutId is instance-suffixed so
 * two controls never cross-pollinate their pill.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const pillId = useId();
  const onKeyDown = useArrowNavigation('horizontal');

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx('inline-flex gap-1 rounded-pill border border-border bg-bgSunken p-1', className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-arrow-item
            disabled={opt.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cx(
              'relative inline-flex h-9 items-center justify-center rounded-pill px-3 text-small font-medium transition-colors',
              'disabled:pointer-events-none disabled:opacity-40',
              selected ? 'text-text' : 'text-textMuted hover:text-text',
            )}
          >
            {selected && (
              <motion.span
                layoutId={pillId}
                transition={springSnappy}
                className="absolute inset-0 rounded-pill bg-bgElevated shadow-card"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
