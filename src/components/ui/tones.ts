/** Shared tonal palette keys mapped to the icon-badge CSS variables (no hex in JSX). */
export type Tone = 'accent' | 'positive' | 'warn' | 'danger' | 'info' | 'purple' | 'neutral';

export const badgeBg: Record<Tone, string> = {
  accent: 'bg-[var(--badge-accent-bg)]',
  positive: 'bg-[var(--badge-positive-bg)]',
  warn: 'bg-[var(--badge-warn-bg)]',
  danger: 'bg-[var(--badge-danger-bg)]',
  info: 'bg-[var(--badge-info-bg)]',
  purple: 'bg-[var(--badge-purple-bg)]',
  neutral: 'bg-[var(--badge-neutral-bg)]',
};

export const badgeFg: Record<Tone, string> = {
  accent: 'text-[var(--badge-accent-fg)]',
  positive: 'text-[var(--badge-positive-fg)]',
  warn: 'text-[var(--badge-warn-fg)]',
  danger: 'text-[var(--badge-danger-fg)]',
  info: 'text-[var(--badge-info-fg)]',
  purple: 'text-[var(--badge-purple-fg)]',
  neutral: 'text-[var(--badge-neutral-fg)]',
};
