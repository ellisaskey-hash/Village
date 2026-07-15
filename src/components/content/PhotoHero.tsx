import { Icon, type IconName } from '@/components/ui';

interface PhotoHeroProps {
  photos?: string[];
  icon: IconName;
  from?: string;
  to?: string;
}

/** Full-width hero for detail screens: a scrollable photo strip, or a tinted gradient + icon
 *  when there are no photos, so a seeded entity's detail page is never a bare card. */
export function PhotoHero({ photos, icon, from = 'var(--c-accent)', to = 'var(--c-accent-warm)' }: PhotoHeroProps) {
  const list = photos ?? [];
  if (list.length === 0) {
    return (
      <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-border" style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}>
        <Icon name={icon} size={48} className="text-textOnAccent opacity-90" />
      </div>
    );
  }
  if (list.length === 1) {
    return <img src={list[0]} alt="" className="h-52 w-full rounded-xl border border-border object-cover" loading="lazy" />;
  }
  return (
    <div className="flex gap-2 overflow-x-auto rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {list.map((src, i) => (
        <img key={i} src={src} alt="" loading="lazy" className="h-52 w-auto shrink-0 rounded-xl border border-border object-cover" />
      ))}
    </div>
  );
}
