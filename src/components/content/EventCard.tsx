import { motion } from 'framer-motion';
import { springSnappy } from '@/lib/motion';
import { Icon } from '@/components/ui';
import { formatWhen } from '@/lib/ics';
import type { Event } from '@/lib/services/types';

const CAT: Record<Event['category'], { from: string; to: string }> = {
  community: { from: 'var(--c-accent)', to: 'var(--c-accent-warm)' },
  school: { from: 'var(--c-info)', to: 'var(--c-accent)' },
  sport: { from: 'var(--c-positive)', to: 'var(--c-info)' },
  club: { from: 'var(--c-purple)', to: 'var(--c-accent)' },
  church: { from: 'var(--c-info)', to: 'var(--c-purple)' },
  market: { from: 'var(--c-accent-warm)', to: 'var(--c-accent)' },
  other: { from: 'var(--c-accent)', to: 'var(--c-purple)' },
};

/** Photo-forward event card (spec 07): hero, floating date chip, title, time, going count. */
export function EventCard({ event: e, onClick }: { event: Event; onClick: () => void }) {
  const photo = (e.photos ?? [])[0];
  const cat = CAT[e.category];
  const start = new Date(e.startsAt);
  const day = start.getDate();
  const month = start.toLocaleString('en-GB', { month: 'short' });

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={springSnappy}
      className="group flex w-full overflow-hidden rounded-lg border border-border bg-bgElevated text-left shadow-card transition-shadow hover:shadow-raised"
    >
      <div className="relative h-auto w-28 shrink-0 overflow-hidden sm:w-36">
        {photo ? (
          <img src={photo} alt={e.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full" style={{ backgroundImage: `linear-gradient(135deg, ${cat.from}, ${cat.to})` }} />
        )}
        <div className="absolute left-2 top-2 flex flex-col items-center rounded-md bg-bgElevated/95 px-2 py-1 text-center shadow-card backdrop-blur-md">
          <span className="text-h3 font-bold leading-none text-text">{day}</span>
          <span className="text-eyebrow uppercase text-textMuted">{month}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3">
        <p className="truncate text-body font-semibold text-text">{e.title}</p>
        <p className="truncate text-small text-textMuted">{formatWhen(e.startsAt)}</p>
        {e.rsvpMode !== 'none' && (
          <span className="flex items-center gap-1 text-small text-textMuted">
            <Icon name="people" size={14} className="text-accent" /> {e.goingCount} going
          </span>
        )}
      </div>
    </motion.button>
  );
}
