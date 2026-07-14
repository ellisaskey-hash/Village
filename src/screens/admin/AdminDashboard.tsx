import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { Badge, Card, EmptyState, IconBadge, ListRow, Skeleton, StatCard } from '@/components/ui';
import { reasonLabel } from './moderationCopy';

/** Admin home: today's numbers + priority reports first (spec 04 §Admin console). */
export function AdminDashboard() {
  const services = useServices();
  const navigate = useNavigate();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';

  const dash = useQuery({
    queryKey: ['admin', 'dashboard', communityId],
    queryFn: () => services.moderation.dashboard(communityId),
    enabled: Boolean(communityId),
  });
  const reports = useQuery({
    queryKey: ['admin', 'reports', communityId],
    queryFn: () => services.moderation.reports(communityId),
    enabled: Boolean(communityId),
  });

  const d = dash.data;
  const priority = (reports.data ?? []).filter((r) => r.priority).slice(0, 5);

  return (
    <>
      {dash.isLoading || !d ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={92} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon="shield" tone={d.openReports ? 'warn' : 'positive'} eyebrow="Open reports" value={d.openReports} onClick={() => navigate('/admin/reports')} />
          <StatCard icon="flame" tone={d.priorityReports ? 'warn' : 'neutral'} eyebrow="Priority" value={d.priorityReports} onClick={() => navigate('/admin/reports')} />
          <StatCard icon="eye" eyebrow="Hidden" value={d.hiddenItems} onClick={() => navigate('/admin/hidden')} />
          <StatCard icon="clock" eyebrow="Awaiting release" value={d.delayedPosts} onClick={() => navigate('/admin/delays')} />
          <StatCard icon="businesses" eyebrow="Claims" value={d.pendingClaims} onClick={() => navigate('/admin/seeding')} />
          <StatCard icon="users" eyebrow="New today" value={d.newMembersToday} onClick={() => navigate('/admin/members')} />
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-h3 font-semibold text-text">Needs a look first</h2>
          {priority.length > 0 && <Badge count={priority.length} tone="warn" />}
        </div>
        {reports.isLoading ? (
          <Skeleton height={72} />
        ) : priority.length === 0 ? (
          <Card>
            <EmptyState icon="check" title="Nothing urgent" body="No safety-flagged reports are waiting. The full queue is under Reports." />
          </Card>
        ) : (
          <div className="space-y-2">
            {priority.map((r) => (
              <ListRow
                key={r.id}
                leading={<IconBadge icon="flame" tone="warn" />}
                title={r.targetLabel ?? `${r.targetKind} report`}
                subtitle={`${reasonLabel(r.reason)} · flagged as needing attention`}
                trailing={<Badge count={r.reportCount} tone="warn" />}
                onClick={() => navigate('/admin/reports')}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
