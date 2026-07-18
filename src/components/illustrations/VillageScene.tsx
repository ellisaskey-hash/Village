/**
 * The village-at-dusk hero (spec 05 identity: "lit windows, warm brick, the green after rain").
 * A stylised row of cottages with lit honey windows under a warm dusk sky, in the leaf+honey
 * duotone. Decorative; theme-aware via the accent tokens. Scales to its container width.
 */
export function VillageScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 190" className={className} width="100%" fill="none" aria-hidden role="img" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--c-accent-warm)" stopOpacity="0.30" />
          <stop offset="0.7" stopColor="var(--c-accent-warm)" stopOpacity="0.06" />
          <stop offset="1" stopColor="var(--c-accent)" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* dusk sky */}
      <rect x="0" y="0" width="360" height="190" rx="18" fill="url(#dusk)" />
      {/* low sun */}
      <circle cx="292" cy="58" r="24" fill="var(--c-accent-warm)" opacity="0.55" />

      {/* the green */}
      <path d="M0 150 q120 -18 200 -6 q90 14 160 -2 v48 H0 Z" fill="var(--c-accent)" opacity="0.16" />

      {/* tree */}
      <g stroke="var(--c-accent)" strokeWidth="3.5" strokeLinecap="round">
        <line x1="44" y1="150" x2="44" y2="118" />
        <circle cx="44" cy="104" r="18" fill="var(--c-accent)" fillOpacity="0.14" />
      </g>

      {/* cottages — body + pitched roof + a lit honey window */}
      {/* cottage 1 */}
      <g>
        <rect x="84" y="112" width="42" height="40" rx="3" fill="var(--c-bg-elevated)" stroke="var(--c-accent)" strokeWidth="3.5" />
        <path d="M80 112 L105 92 L130 112 Z" fill="var(--c-accent)" fillOpacity="0.16" stroke="var(--c-accent)" strokeWidth="3.5" strokeLinejoin="round" />
        <rect x="97" y="124" width="16" height="14" rx="2" fill="var(--c-accent-warm)" opacity="0.9" />
      </g>
      {/* cottage 2 (taller, centre) */}
      <g>
        <rect x="146" y="98" width="46" height="54" rx="3" fill="var(--c-bg-elevated)" stroke="var(--c-accent)" strokeWidth="3.5" />
        <path d="M142 98 L169 74 L196 98 Z" fill="var(--c-accent)" fillOpacity="0.16" stroke="var(--c-accent)" strokeWidth="3.5" strokeLinejoin="round" />
        <rect x="153" y="110" width="14" height="12" rx="2" fill="var(--c-accent-warm)" opacity="0.9" />
        <rect x="171" y="110" width="14" height="12" rx="2" fill="var(--c-accent-warm)" opacity="0.9" />
        <rect x="162" y="132" width="14" height="20" rx="2" fill="var(--c-accent)" fillOpacity="0.18" stroke="var(--c-accent)" strokeWidth="3" />
      </g>
      {/* cottage 3 */}
      <g>
        <rect x="212" y="116" width="40" height="36" rx="3" fill="var(--c-bg-elevated)" stroke="var(--c-accent)" strokeWidth="3.5" />
        <path d="M208 116 L232 98 L256 116 Z" fill="var(--c-accent)" fillOpacity="0.16" stroke="var(--c-accent)" strokeWidth="3.5" strokeLinejoin="round" />
        <rect x="224" y="127" width="16" height="14" rx="2" fill="var(--c-accent-warm)" opacity="0.9" />
      </g>

      {/* ground line */}
      <line x1="16" y1="152" x2="344" y2="152" stroke="var(--c-accent)" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
