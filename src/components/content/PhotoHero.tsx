import { useState, type UIEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { backdropMotion } from '@/lib/motion';
import { Icon, IconButton, type IconName } from '@/components/ui';

interface PhotoHeroProps {
  photos?: string[];
  icon: IconName;
  /** Used for meaningful alt text (e.g. the listing/event title). */
  label?: string;
  from?: string;
  to?: string;
}

/** Full-width hero for detail screens: a snap-scrolling photo gallery with a counter, dot markers
 *  and tap-to-zoom, or a tinted gradient + icon when there are no photos. */
export function PhotoHero({ photos, icon, label, from = 'var(--c-accent)', to = 'var(--c-accent-warm)' }: PhotoHeroProps) {
  const list = photos ?? [];
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const alt = label ? `Photo of ${label}` : '';

  if (list.length === 0) {
    return (
      <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-border" style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}>
        <Icon name={icon} size={48} className="text-textOnAccent opacity-90" />
      </div>
    );
  }

  function onScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <>
      <div className="relative">
        <div
          onScroll={list.length > 1 ? onScroll : undefined}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {list.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setZoom(i)}
              aria-label={`View photo ${i + 1} of ${list.length}`}
              className="w-full shrink-0 snap-center"
            >
              <img src={src} alt={list.length > 1 ? `${alt} (${i + 1} of ${list.length})` : alt} loading="lazy" className="h-52 w-full rounded-xl border border-border object-cover" />
            </button>
          ))}
        </div>

        {list.length > 1 && (
          <>
            <span className="pointer-events-none absolute right-2 top-2 rounded-pill bg-bg/70 px-2 py-0.5 text-micro font-semibold text-text backdrop-blur-md">
              {index + 1}/{list.length}
            </span>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {list.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-textOnAccent' : 'w-1.5 bg-textOnAccent/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {zoom !== null && (
          <motion.div
            variants={backdropMotion}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setZoom(null)}
            className="fixed inset-0 z-modal flex items-center justify-center bg-black/90 p-4"
          >
            <span className="absolute right-3 top-3">
              <IconButton icon="close" ariaLabel="Close" variant="surface" size="md" onClick={() => setZoom(null)} />
            </span>
            <img src={list[zoom]} alt={alt} className="max-h-full max-w-full rounded-lg object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
