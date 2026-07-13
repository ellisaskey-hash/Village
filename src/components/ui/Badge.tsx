import { cx } from '@/lib/cx';
import { badgeBg, badgeFg, type Tone } from './tones';

interface BadgeProps {
  count?: number;
  dot?: boolean;
  tone?: Tone;
  className?: string;
}

/** Small count or presence indicator (COMPONENT_INVENTORY 3.14). */
export function Badge({ count, dot = false, tone = 'accent', className }: BadgeProps) {
  if (dot) {
    return (
      <span
        className={cx('inline-block h-2 w-2 rounded-full', badgeBg[tone], badgeFg[tone], className)}
        style={{ backgroundColor: 'currentColor' }}
      />
    );
  }
  const label = typeof count === 'number' ? (count > 99 ? '99+' : String(count)) : '';
  return (
    <span
      className={cx(
        'tabular inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-micro font-semibold',
        badgeBg[tone],
        badgeFg[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
