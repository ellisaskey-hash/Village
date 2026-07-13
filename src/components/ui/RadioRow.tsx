import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { springSnappy } from '@/lib/motion';
import { useArrowNavigation } from '@/lib/useArrowNavigation';

interface RadioOption<T extends string> {
  value: T;
  label: string;
  helper?: string;
}

interface RadioGroupProps<T extends string> {
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Large one-of-N selectable rows (COMPONENT_INVENTORY 2.8). Border brightens on hover;
 * the dot springs in on select. Rendered as a roving-focus radiogroup.
 */
export function RadioGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: RadioGroupProps<T>) {
  const onKeyDown = useArrowNavigation('vertical');
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx('flex flex-col gap-2', className)}
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
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cx(
              'flex items-center gap-3 rounded-lg border bg-bgElevated px-cardPad py-3 text-left transition-colors',
              selected ? 'border-accent' : 'border-border hover:border-borderStrong',
            )}
          >
            <span
              className={cx(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                selected ? 'border-accent' : 'border-borderStrong',
              )}
            >
              {selected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={springSnappy}
                  className="h-2.5 w-2.5 rounded-full bg-accent"
                />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-body font-medium text-text">{opt.label}</span>
              {opt.helper && <span className="block text-small text-textMuted">{opt.helper}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
