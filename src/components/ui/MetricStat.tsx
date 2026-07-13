import { cx } from '@/lib/cx';
import { Icon } from './Icon';

interface MetricStatProps {
  value: string | number;
  label: string;
  delta?: { value: string; direction: 'up' | 'down' | 'none' };
  className?: string;
}

/** Big tabular number + label + optional delta arrow (COMPONENT_INVENTORY 4.3). */
export function MetricStat({ value, label, delta, className }: MetricStatProps) {
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <span className="tabular font-display text-display leading-none text-text">{value}</span>
      <span className="text-small text-textMuted">{label}</span>
      {delta && (
        <span
          className={cx(
            'inline-flex items-center gap-1 text-small font-medium',
            delta.direction === 'up' && 'text-positive',
            delta.direction === 'down' && 'text-danger',
            delta.direction === 'none' && 'text-textMuted',
          )}
        >
          {delta.direction !== 'none' && (
            <Icon name={delta.direction === 'up' ? 'trend-up' : 'trend-down'} size={14} />
          )}
          {delta.value}
        </span>
      )}
    </div>
  );
}
