import { describe, it, expect } from 'vitest';
import { color } from '@design/tokens';

/**
 * WCAG AA contrast gate over every text token, both themes (spec 05 accessibility floor,
 * Elevra fix #5). This is the AA source of truth; axe's color-contrast rule is disabled in
 * the gallery run because it cannot reason about the translucent hearth-ambient background.
 */
function toLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Not a 6-digit hex: ${hex}`);
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(['dark', 'light'] as const)('AA contrast — %s theme', (theme) => {
  const c = color[theme];

  it('primary text passes AA (>= 4.5) on bg and bgElevated', () => {
    expect(contrast(c.text, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.text, c.bgElevated)).toBeGreaterThanOrEqual(4.5);
  });

  it('muted text passes AA (>= 4.5) on bg and bgElevated', () => {
    expect(contrast(c.textMuted, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.textMuted, c.bgElevated)).toBeGreaterThanOrEqual(4.5);
  });

  it('text-on-accent passes AA (>= 4.5) on accent fill', () => {
    expect(contrast(c.textOnAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('faint text meets the large-text floor (>= 3.0) — decorative use only', () => {
    expect(contrast(c.textFaint, c.bg)).toBeGreaterThanOrEqual(3.0);
  });
});
