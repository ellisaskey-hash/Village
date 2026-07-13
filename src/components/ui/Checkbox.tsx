import { useId } from 'react';
import { cx } from '@/lib/cx';
import { Icon } from './Icon';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  helper?: string;
  disabled?: boolean;
  className?: string;
}

/** Token-styled checkbox (COMPONENT_INVENTORY 2.7). Whole label is the 44px touch target. */
export function Checkbox({ checked, onChange, label, helper, disabled = false, className }: CheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cx(
        'flex min-h-[44px] cursor-pointer items-center gap-3',
        disabled && 'cursor-not-allowed opacity-40',
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cx(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-colors',
          checked ? 'border-accent bg-accent text-textOnAccent' : 'border-borderStrong text-transparent',
          'peer-focus-visible:shadow-[0_0_0_3px_var(--focus-ring)]',
        )}
      >
        <Icon name="check" size={14} strokeWidth={3} />
      </span>
      <span className="min-w-0">
        <span className="block text-body text-text">{label}</span>
        {helper && <span className="block text-small text-textMuted">{helper}</span>}
      </span>
    </label>
  );
}
