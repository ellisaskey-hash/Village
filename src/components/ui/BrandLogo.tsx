import { useId } from 'react';
import { cx } from '@/lib/cx';
import { BRAND } from '@design/tokens';

interface BrandLogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

/**
 * The Local mark — a hearth/roofline glyph drawn entirely from CSS variables, so a
 * theme, skin, or accent change (and a future rebrand) re-colours it with zero code
 * change. The gradient stops read `var(--c-accent)` / `var(--c-accent-warm)` — the
 * fix-#2 pattern (no hex literals inside SVGs).
 */
export function BrandLogo({ size = 28, withWordmark = false, className }: BrandLogoProps) {
  const gid = useId();
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label={`${BRAND} logo`}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--c-accent)" />
            <stop offset="1" stopColor="var(--c-accent-warm)" />
          </linearGradient>
        </defs>
        <path
          d="M32 12 L50 28 L50 50 L38 50 L38 39 L26 39 L26 50 L14 50 L14 28 Z"
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark && (
        <span className="font-display text-h3 font-bold tracking-tight text-text">{BRAND}</span>
      )}
    </span>
  );
}
