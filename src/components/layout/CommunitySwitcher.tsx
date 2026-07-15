import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cx } from '@/lib/cx';
import { useSession, useActiveMembership, useSessionStore } from '@/app/state/session';
import { Badge, Icon, ListRow, Sheet } from '@/components/ui';

/** Switches the active community for a member of more than one (spec 02: multi-community
 *  membership). A single-community member just sees the name. Switching re-skins the shell. */
export function CommunitySwitcher({ variant }: { variant: 'header' | 'rail' }) {
  const session = useSession();
  const active = useActiveMembership();
  const setActive = useSessionStore((s) => s.setActiveCommunity);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const memberships = session?.memberships ?? [];
  const name = active?.name ?? 'Local';

  if (memberships.length <= 1) {
    return (
      <span className={cx(variant === 'header' ? 'text-h3 font-semibold text-text' : 'block px-2 text-small font-medium text-textMuted')}>
        {name}
      </span>
    );
  }

  function choose(communityId: string) {
    setActive(communityId);
    setOpen(false);
    navigate('/home');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Switch community"
        className={cx(
          'flex items-center gap-1 rounded-lg transition-colors hover:text-text',
          variant === 'header' ? 'text-h3 font-semibold text-text' : 'w-full px-2 py-1 text-small font-medium text-textMuted',
        )}
      >
        <span className="truncate">{name}</span>
        <Icon name="more" size={16} className="shrink-0 text-textMuted" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Switch community" hero={{ icon: 'home', tone: 'accent' }}>
        <div className="space-y-2">
          {memberships.map((m) => (
            <ListRow
              key={m.communityId}
              title={m.name}
              subtitle={m.status === 'seeding' ? 'Setting up' : 'Launched'}
              trailing={m.communityId === active?.communityId ? <Badge tone="positive" dot /> : undefined}
              onClick={() => choose(m.communityId)}
            />
          ))}
        </div>
      </Sheet>
    </>
  );
}
