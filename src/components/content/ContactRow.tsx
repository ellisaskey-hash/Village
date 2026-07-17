import { motion } from 'framer-motion';
import { pressable } from '@/lib/motion';
import { Icon, IconBadge, type IconName } from '@/components/ui';

/** A tappable contact/action row for directory detail pages: call, email, website, directions.
 *  Renders as an <a> so tel:/mailto:/maps deep-links and new-tab websites work; 44px+ target. */
export function ContactRow({
  icon,
  label,
  sublabel,
  href,
  external,
}: {
  icon: IconName;
  label: string;
  sublabel?: string;
  href: string;
  external?: boolean;
}) {
  return (
    <motion.a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      whileTap={pressable.whileTap}
      transition={pressable.transition}
      className="flex min-h-[52px] items-center gap-3 rounded-lg border border-border bg-bgElevated px-3 py-2 transition-colors hover:border-borderStrong"
    >
      <IconBadge icon={icon} tone="accent" />
      <div className="min-w-0 flex-1">
        {sublabel && <p className="text-micro uppercase tracking-wide text-textFaint">{sublabel}</p>}
        <p className="truncate text-body text-text">{label}</p>
      </div>
      <Icon name={external ? 'external-link' : 'chevron-right'} size={16} className="shrink-0 text-textFaint" />
    </motion.a>
  );
}
