import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { springSnappy } from '@/lib/motion';
import { Icon, type IconName } from '@/components/ui';

interface DirectoryCardProps {
  title: string;
  subtitle: string;
  icon: IconName;
  photos?: string[];
  /** Small pill overlaid on the photo, e.g. "Claim it" or "Verified". */
  badge?: { label: string; tone: 'accent' | 'positive' | 'info' };
  onClick?: () => void;
  from?: string;
  to?: string;
}

const TONE: Record<'accent' | 'positive' | 'info', string> = {
  accent: 'bg-bgElevated/90 text-text',
  positive: 'bg-positive text-textOnAccent',
  info: 'bg-info text-textOnAccent',
};

/** Photo-forward directory card for businesses / places (spec 07 directory). Gradient + icon
 *  fallback when there is no photo, so a seeded stub is never blank. */
export function DirectoryCard({ title, subtitle, icon, photos, badge, onClick, from = 'var(--c-accent)', to = 'var(--c-accent-warm)' }: DirectoryCardProps) {
  const photo = (photos ?? [])[0];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={springSnappy}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-bgElevated text-left shadow-card transition-shadow hover:shadow-raised"
    >
      <div className="relative h-32 w-full overflow-hidden">
        {photo ? (
          <img src={photo} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}>
            <Icon name={icon} size={32} className="text-textOnAccent opacity-90" />
          </div>
        )}
        {badge && (
          <span className={cx('absolute left-2 top-2 rounded-pill px-2.5 py-1 text-small font-semibold shadow-card backdrop-blur-md', TONE[badge.tone])}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="min-w-0 p-3">
        <p className="truncate text-body font-semibold text-text">{title}</p>
        <p className="truncate text-small text-textMuted">{subtitle}</p>
      </div>
    </motion.button>
  );
}
