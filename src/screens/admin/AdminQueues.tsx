import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import {
  Badge, Button, Card, EmptyState, IconBadge, ListRow, Skeleton, useToasts,
} from '@/components/ui';
import { actionLabel, kindLabel } from './moderationCopy';
import type { ModerationTargetKind } from '@/lib/services/types';

function useCommunityId() {
  return useActiveMembership()?.communityId ?? '';
}

/** Auto-hidden / hidden items awaiting a decision. Un-hide restores; Remove keeps it down. */
export function HiddenQueue() {
  const services = useServices();
  const push = useToasts();
  const qc = useQueryClient();
  const communityId = useCommunityId();
  const q = useQuery({
    queryKey: ['admin', 'hidden', communityId],
    queryFn: () => services.moderation.hidden(communityId),
    enabled: Boolean(communityId),
  });

  async function act(kind: string, id: string, action: 'unhide' | 'remove') {
    try {
      await services.moderation.moderate(action, kind as ModerationTargetKind, id);
      push({ title: action === 'unhide' ? 'Restored' : 'Kept hidden', variant: 'success' });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin', 'hidden', communityId] }),
        qc.invalidateQueries({ queryKey: ['admin', 'dashboard', communityId] }),
      ]);
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    }
  }

  const items = q.data ?? [];
  if (q.isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={72} />)}</div>;
  if (items.length === 0) return <Card><EmptyState icon="eye" title="Nothing hidden" body="Auto-hidden and moderator-hidden items appear here until you decide what to do." /></Card>;
  return (
    <div className="space-y-2">
      {items.map((h) => (
        <ListRow
          key={`${h.kind}:${h.id}`}
          leading={<IconBadge icon="eye" tone="warn" />}
          title={h.title}
          subtitle={`${kindLabel(h.kind)} · ${h.reason ?? 'hidden'}`}
          trailing={
            <span className="flex items-center gap-1">
              <Button variant="secondary" size="sm" onClick={() => act(h.kind, h.id, 'unhide')}>Restore</Button>
              <Button variant="ghost" size="sm" onClick={() => act(h.kind, h.id, 'remove')}>Keep hidden</Button>
            </span>
          }
        />
      ))}
    </div>
  );
}

/** Trust-0 first-post delay queue. Config-gated off by default, so usually empty by design. */
export function DelaysQueue() {
  const services = useServices();
  const push = useToasts();
  const qc = useQueryClient();
  const communityId = useCommunityId();
  const q = useQuery({
    queryKey: ['admin', 'delays', communityId],
    queryFn: () => services.moderation.delays(communityId),
    enabled: Boolean(communityId),
  });

  async function release(id: string) {
    try {
      await services.moderation.releaseDelay(id);
      push({ title: 'Published', variant: 'success' });
      await qc.invalidateQueries({ queryKey: ['admin', 'delays', communityId] });
      await qc.invalidateQueries({ queryKey: ['admin', 'dashboard', communityId] });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    }
  }

  const items = (q.data ?? []).filter((d) => !d.releasedAt);
  if (q.isLoading) return <Skeleton height={72} />;
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="clock"
          title="No posts waiting"
          body="A new neighbour's first post of each kind can be held briefly for a look. This is off by default and turns on per community when a launch needs it."
        />
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((d) => (
        <ListRow
          key={d.id}
          leading={<IconBadge icon="clock" tone="accent" />}
          title={`${d.profileName}'s first ${kindLabel(d.contentKind).toLowerCase()}`}
          subtitle={`Releases ${new Date(d.releaseAt).toLocaleString('en-GB')}`}
          trailing={<Button variant="primary" size="sm" onClick={() => release(d.id)}>Publish now</Button>}
        />
      ))}
    </div>
  );
}

/** The full audit trail — every action ever, most recent first (spec 04: the accountability
 *  mechanism for a platform that moderates itself). */
export function ModerationLog() {
  const services = useServices();
  const communityId = useCommunityId();
  const q = useQuery({
    queryKey: ['admin', 'log', communityId],
    queryFn: () => services.moderation.log(communityId),
    enabled: Boolean(communityId),
  });
  const items = q.data ?? [];
  if (q.isLoading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={64} />)}</div>;
  if (items.length === 0) return <Card><EmptyState icon="listings" title="No actions yet" body="Every moderation action, automatic or human, is recorded here." /></Card>;
  return (
    <div className="space-y-2">
      {items.map((a) => (
        <ListRow
          key={a.id}
          leading={<IconBadge icon={a.actorId ? 'shield' : 'sparkle'} tone={a.action === 'unhide' || a.action === 'unsuspend' ? 'positive' : 'accent'} />}
          title={actionLabel(a.action)}
          subtitle={`${kindLabel(a.targetKind)} · by ${a.actorName} · ${new Date(a.createdAt).toLocaleString('en-GB')}`}
          trailing={<Badge tone="neutral" dot />}
        />
      ))}
    </div>
  );
}
