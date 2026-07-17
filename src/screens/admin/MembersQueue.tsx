import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import {
  Avatar, Badge, Button, Card, EmptyState, ListRow, QueryError, Sheet, Skeleton, VirtualList, useToasts,
} from '@/components/ui';
import type { AdminMember } from '@/lib/services/types';

const TRUST_LABEL = ['New', 'Established', 'Verified', 'Steward'];

/** Members with trust + suspension state. Detail sheet carries trust changes and suspend /
 *  unsuspend (spec 04 §Demotion — all via admin_moderate, all logged). */
export function MembersQueue() {
  const services = useServices();
  const push = useToasts();
  const qc = useQueryClient();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin', 'members', communityId],
    queryFn: () => services.moderation.members(communityId),
    enabled: Boolean(communityId),
  });
  const members = q.data ?? [];
  const selected = members.find((m) => m.profileId === openId) ?? null;

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ['admin', 'members', communityId] });
  }

  async function suspend(m: AdminMember, days: number) {
    try {
      await services.moderation.moderate('suspend', 'profile', m.profileId, { community_id: communityId, days });
      push({ title: `${m.displayName}'s posting is paused`, variant: 'success' });
      setOpenId(null);
      await refresh();
    } catch (e) { push({ title: errorMessage(e), variant: 'error' }); }
  }
  async function unsuspend(m: AdminMember) {
    try {
      await services.moderation.moderate('unsuspend', 'profile', m.profileId, { community_id: communityId });
      push({ title: `${m.displayName} can post again`, variant: 'success' });
      setOpenId(null);
      await refresh();
    } catch (e) { push({ title: errorMessage(e), variant: 'error' }); }
  }
  async function setTrust(m: AdminMember, level: number) {
    try {
      await services.moderation.moderate('trustChange', 'profile', m.profileId, { community_id: communityId, level });
      push({ title: `${m.displayName} is now ${TRUST_LABEL[level]}`, variant: 'success' });
      await refresh();
    } catch (e) { push({ title: errorMessage(e), variant: 'error' }); }
  }

  function isSuspended(m: AdminMember): boolean {
    return Boolean(m.suspendedUntil && m.suspendedUntil > new Date().toISOString());
  }

  if (q.isError) return <Card><QueryError onRetry={() => q.refetch()} body="We couldn't load members. This is a load error, not an empty community." /></Card>;
  if (q.isLoading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={64} />)}</div>;
  if (members.length === 0) return <Card><EmptyState icon="users" title="No members yet" body="Everyone who joins this community shows up here." /></Card>;

  return (
    <>
      <VirtualList
        items={members}
        getKey={(m) => m.profileId}
        estimateSize={72}
        renderItem={(m) => (
          <ListRow
            leading={<Avatar name={m.displayName} {...(m.avatarUrl ? { src: m.avatarUrl } : {})} size="md" />}
            title={m.displayName}
            subtitle={`${TRUST_LABEL[m.trustLevel]}${m.upheldReports > 0 ? ` · ${m.upheldReports} upheld ${m.upheldReports === 1 ? 'report' : 'reports'}` : ''}`}
            trailing={isSuspended(m) ? <Badge tone="warn" dot /> : undefined}
            onClick={() => setOpenId(m.profileId)}
          />
        )}
      />

      <Sheet open={Boolean(selected)} onClose={() => setOpenId(null)} title={selected?.displayName ?? 'Member'} hero={{ icon: 'user', tone: 'accent' }}>
        {selected && (
          <div className="space-y-5">
            <Card className="space-y-1">
              <p className="text-small text-textMuted">Trust</p>
              <p className="text-body font-medium text-text">{TRUST_LABEL[selected.trustLevel]}</p>
              {selected.upheldReports > 0 && <p className="text-small text-warn">{selected.upheldReports} upheld {selected.upheldReports === 1 ? 'report' : 'reports'}</p>}
              {isSuspended(selected) && <p className="text-small text-warn">Paused until {new Date(selected.suspendedUntil!).toLocaleDateString('en-GB')}</p>}
            </Card>

            <div className="space-y-2">
              <p className="text-eyebrow uppercase text-textMuted">Set trust</p>
              <div className="flex flex-wrap gap-2">
                {TRUST_LABEL.map((label, level) => (
                  <Button
                    key={level}
                    variant={selected.trustLevel === level ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setTrust(selected, level)}
                    disabled={selected.trustLevel === level}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-eyebrow uppercase text-textMuted">Posting</p>
              {isSuspended(selected) ? (
                <Button variant="primary" size="xl" fullWidth leadingIcon="check" onClick={() => unsuspend(selected)}>Let them post again</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="secondary" size="xl" fullWidth onClick={() => suspend(selected, 7)}>Pause 7 days</Button>
                  <Button variant="danger" size="xl" fullWidth onClick={() => suspend(selected, 30)}>Pause 30 days</Button>
                </div>
              )}
              <p className="text-small text-textMuted">Pausing stops them posting. They can still read and message. Every change is logged.</p>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
