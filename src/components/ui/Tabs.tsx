import { useId } from 'react';
import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { springGentle } from '@/lib/motion';
import { useArrowNavigation } from '@/lib/useArrowNavigation';

interface Tab<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * In-screen tabs with a sliding active underline via `layoutId` (COMPONENT_INVENTORY 5.8).
 * Softer spring than SegmentedControl so it settles with less wobble.
 */
export function Tabs<T extends string>({ tabs, value, onChange, ariaLabel, className }: TabsProps<T>) {
  const underlineId = useId();
  const onKeyDown = useArrowNavigation('horizontal');

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx('flex gap-1 border-b border-border', className)}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            data-arrow-item
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cx(
              'relative px-3 pb-2.5 pt-1 text-small font-medium transition-colors',
              selected ? 'text-text' : 'text-textMuted hover:text-text',
            )}
          >
            {tab.label}
            {selected && (
              <motion.span
                layoutId={underlineId}
                transition={springGentle}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
