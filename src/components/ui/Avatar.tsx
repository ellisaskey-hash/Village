import { cx } from '@/lib/cx';
import { Icon } from './Icon';
import { badgeBg, badgeFg, type Tone } from './tones';

interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const BOX: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-small',
  md: 'h-10 w-10 text-body',
  lg: 'h-12 w-12 text-h3',
  xl: 'h-16 w-16 text-h2',
};

const DISC_TONES: Tone[] = ['accent', 'warn', 'info', 'purple', 'positive'];

/** Deterministic disc colour — "Tom B." always lands on the same tone (COMPONENT_INVENTORY 4.12). */
function toneFor(name: string): Tone {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return DISC_TONES[hash % DISC_TONES.length]!;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const tone = name ? toneFor(name) : 'neutral';
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        BOX[size],
        !src && badgeBg[tone],
        !src && badgeFg[tone],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name ?? ''} className="h-full w-full object-cover" />
      ) : name ? (
        <span>{initials(name)}</span>
      ) : (
        <Icon name="user" size={18} />
      )}
    </span>
  );
}
