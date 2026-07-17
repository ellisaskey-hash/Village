import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { springSnappy } from '@/lib/motion';
import { Icon } from '@/components/ui';
import { LISTING_STATUS_LABEL, labelFor } from '@/lib/labels';
import { relativeTime } from '@/lib/ics';
import type { Listing } from '@/lib/services/types';

/** Clean UK price: whole pounds drop the .00, thousands are grouped. £40 · £1,250 · £19.99 */
export function formatPrice(pence: number): string {
  const hasPence = pence % 100 !== 0;
  return `£${(pence / 100).toLocaleString('en-GB', {
    minimumFractionDigits: hasPence ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Kind → the badge label + the placeholder gradient when a listing has no photo. */
const KIND: Record<Listing['kind'], { label: string; from: string; to: string }> = {
  sell: { label: 'For sale', from: 'var(--c-accent)', to: 'var(--c-accent-warm)' },
  free: { label: 'Free', from: 'var(--c-positive)', to: 'var(--c-accent)' },
  wanted: { label: 'Wanted', from: 'var(--c-purple)', to: 'var(--c-accent)' },
  lend: { label: 'To borrow', from: 'var(--c-info)', to: 'var(--c-accent)' },
};

export function priceBadge(l: Listing): string {
  if (l.kind === 'free') return 'Free';
  if (l.kind === 'wanted') return 'Wanted';
  if (l.kind === 'lend') return 'To borrow';
  return l.pricePence != null ? formatPrice(l.pricePence) : 'For sale';
}

interface ListingCardProps {
  listing: Listing;
  onClick: () => void;
  /** `compact` is the fixed-width card used in the Home horizontal scroller. */
  variant?: 'full' | 'compact';
}

/** Photo-forward listing card (spec 07: photo, price/FREE/WANTED badge, title, status).
 *  Falls back to a kind-tinted gradient + icon when there is no photo, so it is never blank. */
export function ListingCard({ listing: l, onClick, variant = 'full' }: ListingCardProps) {
  const kind = KIND[l.kind];
  const photo = (l.photos ?? [])[0];
  const reserved = l.status === 'reserved';
  const closed = l.status === 'completed' || l.status === 'expired' || l.status === 'withdrawn';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={springSnappy}
      className={cx(
        'group flex flex-col overflow-hidden rounded-lg border border-border bg-bgElevated text-left shadow-card transition-shadow hover:shadow-raised',
        variant === 'compact' ? 'w-56 shrink-0' : 'w-full',
      )}
    >
      <div className={cx('relative w-full overflow-hidden', variant === 'compact' ? 'h-32' : 'h-44')}>
        {photo ? (
          <img src={photo} alt={l.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ backgroundImage: `linear-gradient(135deg, ${kind.from}, ${kind.to})` }}>
            <Icon name="listings" size={variant === 'compact' ? 28 : 40} className="text-textOnAccent opacity-90" />
          </div>
        )}
        <span className={cx(
          'absolute left-2 top-2 rounded-pill px-2.5 py-1 text-small font-semibold shadow-card backdrop-blur-md',
          l.kind === 'free' ? 'bg-positive text-textOnAccent' : 'bg-bgElevated/90 text-text',
        )}>
          {priceBadge(l)}
        </span>
        {(reserved || closed) && (
          <span className="absolute right-2 top-2 rounded-pill bg-bg/80 px-2.5 py-1 text-small font-medium text-textMuted backdrop-blur-md">
            {reserved ? 'Reserved' : labelFor(LISTING_STATUS_LABEL, l.status)}
          </span>
        )}
      </div>
      <div className="min-w-0 p-3">
        <p className="truncate text-body font-semibold text-text">{l.title}</p>
        <p className="truncate text-small text-textMuted">{l.authorName} · {relativeTime(l.createdAt)}</p>
      </div>
    </motion.button>
  );
}
