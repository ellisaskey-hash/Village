/**
 * Duotone spot illustrations for empty states — leaf green (`--c-accent`) + honey (`--c-accent-warm`)
 * on a soft accent disc, so a quiet community reads as intentional and warm rather than blank. One
 * cohesive family; theme-aware via the accent tokens. First set (spec 05 §Iconography, illustration
 * slot). Decorative — the copy carries the meaning.
 */
const SIZE = 132;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 132 132" fill="none" aria-hidden role="img">
      <circle cx="66" cy="66" r="60" fill="var(--c-accent)" opacity="0.09" />
      {children}
    </svg>
  );
}

/** Two nested speech bubbles — for empty inbox / messages. */
export function EmptyMessages() {
  return (
    <Frame>
      <rect x="30" y="40" width="56" height="38" rx="13" fill="var(--c-accent-warm)" opacity="0.9" />
      <path d="M42 76 v13 l15 -13 z" fill="var(--c-accent-warm)" opacity="0.9" />
      <rect x="52" y="56" width="52" height="36" rx="13" fill="var(--c-bg-elevated)" stroke="var(--c-accent)" strokeWidth="4" />
      <path d="M92 90 v13 l-15 -13 z" fill="var(--c-bg-elevated)" stroke="var(--c-accent)" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="68" cy="74" r="3" fill="var(--c-accent)" />
      <circle cx="79" cy="74" r="3" fill="var(--c-accent)" />
      <circle cx="90" cy="74" r="3" fill="var(--c-accent)" />
    </Frame>
  );
}

/** A price tag — for empty listings / marketplace. */
export function EmptyListings() {
  return (
    <Frame>
      <rect x="34" y="34" width="46" height="46" rx="10" transform="rotate(-12 57 57)" fill="var(--c-accent-warm)" opacity="0.9" />
      <g transform="rotate(8 74 72)">
        <path d="M52 60 h30 a6 6 0 0 1 6 6 v20 l-24 20 a6 6 0 0 1 -8 0 l-16 -16 a6 6 0 0 1 0 -8 l12 -14 a6 6 0 0 1 -0 -8 z" fill="var(--c-bg-elevated)" stroke="var(--c-accent)" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="74" cy="72" r="5" fill="none" stroke="var(--c-accent)" strokeWidth="4" />
      </g>
    </Frame>
  );
}

/** Two hands / a helping gesture — for empty requests. */
export function EmptyRequests() {
  return (
    <Frame>
      <path d="M34 84 q10 -22 30 -22 q20 0 30 22" fill="none" stroke="var(--c-accent-warm)" strokeWidth="8" strokeLinecap="round" opacity="0.9" />
      <circle cx="66" cy="52" r="12" fill="var(--c-bg-elevated)" stroke="var(--c-accent)" strokeWidth="4" />
      <path d="M40 96 q26 14 52 0" fill="none" stroke="var(--c-accent)" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

/** A calendar with a heart — for empty events. */
export function EmptyEvents() {
  return (
    <Frame>
      <rect x="36" y="42" width="60" height="52" rx="10" fill="var(--c-accent-warm)" opacity="0.9" />
      <rect x="44" y="54" width="52" height="44" rx="8" fill="var(--c-bg-elevated)" stroke="var(--c-accent)" strokeWidth="4" transform="translate(4 4)" />
      <line x1="58" y1="38" x2="58" y2="50" stroke="var(--c-accent)" strokeWidth="4" strokeLinecap="round" />
      <line x1="82" y1="38" x2="82" y2="50" stroke="var(--c-accent)" strokeWidth="4" strokeLinecap="round" />
      <path d="M74 74 c-3 -5 -11 -3 -11 3 c0 5 7 9 11 12 c4 -3 11 -7 11 -12 c0 -6 -8 -8 -11 -3 z" fill="var(--c-accent)" transform="translate(4 4)" />
    </Frame>
  );
}

/** A shopfront / cluster of buildings — for empty directory. */
export function EmptyDirectory() {
  return (
    <Frame>
      <rect x="38" y="58" width="26" height="38" rx="5" fill="var(--c-accent-warm)" opacity="0.9" />
      <rect x="64" y="46" width="30" height="50" rx="5" fill="var(--c-bg-elevated)" stroke="var(--c-accent)" strokeWidth="4" />
      <path d="M64 46 l15 -12 l15 12" fill="none" stroke="var(--c-accent)" strokeWidth="4" strokeLinejoin="round" />
      <rect x="73" y="74" width="12" height="22" rx="3" fill="none" stroke="var(--c-accent)" strokeWidth="4" />
    </Frame>
  );
}
