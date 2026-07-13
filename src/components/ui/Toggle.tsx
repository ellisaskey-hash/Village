import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { springSnappy } from '@/lib/motion';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  srLabel: string;
  disabled?: boolean;
  className?: string;
}

/** Boolean switch (COMPONENT_INVENTORY 2.10). 44px touch target, spring-animated knob. */
export function Toggle({ checked, onChange, srLabel, disabled = false, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={srLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors',
        'after:absolute after:-inset-2.5 after:content-[""]', // 44px hit area
        checked ? 'bg-accent' : 'bg-borderStrong',
        disabled && 'pointer-events-none opacity-40',
        className,
      )}
    >
      <motion.span
        layout
        transition={springSnappy}
        className="block h-5 w-5 rounded-full bg-bgElevated shadow-card"
        style={{ marginLeft: checked ? '20px' : '0px' }}
      />
    </button>
  );
}
