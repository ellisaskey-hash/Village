import { cx } from '@/lib/cx';
import { Icon, type IconName } from './Icon';
import { badgeBg, badgeFg, type Tone } from './tones';

interface IconBadgeProps {
  icon: IconName;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'rounded';
  variant?: 'filled' | 'tinted-bordered';
  className?: string;
}

const BOX: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};
const GLYPH: Record<'sm' | 'md' | 'lg', number> = { sm: 14, md: 18, lg: 22 };

/** Tone-tinted icon tile — the row leader across drawers and cards (COMPONENT_INVENTORY 4.2). */
export function IconBadge({
  icon,
  tone = 'accent',
  size = 'sm',
  shape = 'circle',
  variant = 'filled',
  className,
}: IconBadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center',
        shape === 'circle' ? 'rounded-full' : 'rounded-md',
        BOX[size],
        badgeBg[tone],
        badgeFg[tone],
        variant === 'tinted-bordered' && 'border border-current/30',
        className,
      )}
    >
      <Icon name={icon} size={GLYPH[size]} />
    </span>
  );
}
