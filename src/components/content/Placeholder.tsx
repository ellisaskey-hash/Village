import { cx } from '@/lib/cx';
import { Icon, type IconName } from '@/components/ui';

/** The single photo-less placeholder for every card and hero. One calm warm surface (cream in
 *  light, near-black in dark) with a faint accent glyph — so a grid of placeholders reads as one
 *  system instead of a wall of clashing per-kind gradients. Real colour is reserved for real photos. */
export function Placeholder({ icon, size = 40, className }: { icon: IconName; size?: number; className?: string }) {
  return (
    <div
      className={cx('flex h-full w-full items-center justify-center', className)}
      style={{ background: 'linear-gradient(155deg, var(--c-bg-sunken), var(--c-bg-elevated))' }}
    >
      <Icon name={icon} size={size} className="text-accent opacity-30" />
    </div>
  );
}
