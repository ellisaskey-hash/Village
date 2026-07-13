import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import { Icon } from './Icon';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  hideLabel?: boolean;
}

/**
 * Token-styled dropdown (COMPONENT_INVENTORY 2.6). Native `<select>` under the hood — OS
 * wheel picker on mobile, keyboard-accessible everywhere — with a token chevron overlay.
 * The 16px input font prevents iOS auto-zoom.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, hideLabel = false, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={selectId} className={cx('text-small font-medium text-text', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className="h-11 w-full appearance-none rounded-md border border-border bg-surface pl-3 pr-9 text-input text-text outline-none transition-colors focus:border-accent"
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-textMuted"
        />
      </div>
    </div>
  );
});
