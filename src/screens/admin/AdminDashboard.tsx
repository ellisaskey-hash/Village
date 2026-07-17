import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { listContainer, listItem } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { Badge, Card, EmptyState, IconBadge, ListRow, QueryError, Skeleton, StatCard, type IconName, type Tone } from '@/components/ui';
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

  const stats: { icon: IconName; tone: Tone; eyebrow: string; value: number; to: string }[] = d ? [
    { icon: 'shield', tone: d.openReports ? 'warn' : 'positive', eyebrow: 'Open reports', value: d.openReports, to: '/admin/reports' },
    { icon: 'flame', tone: d.priorityReports ? 'warn' : 'neutral', eyebrow: 'Priority', value: d.priorityReports, to: '/admin/reports' },
    { icon: 'eye', tone: 'accent', eyebrow: 'Hidden', value: d.hiddenItems, to: '/admin/hidden' },
    { icon: 'clock', tone: 'accent', eyebrow: 'Awaiting release', value: d.delayedPosts, to: '/admin/delays' },
    { icon: 'businesses', tone: 'accent', eyebrow: 'Claims', value: d.pendingClaims, to: '/admin/seeding' },
    { icon: 'users', tone: 'accent', eyebrow: 'New today', value: d.newMembersToday, to: '/admin/members' },
  ] : [];

  return (
    <>
      {dash.isError ? (
        <Card><QueryError onRetry={() => dash.refetch()} body="We couldn't load the dashboard figures. Give it another go." /></Card>
      ) : dash.isLoading || !d ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={92} />)}
        </div>
      ) : (
        <motion.div variants={listContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <motion.div key={s.eyebrow} variants={listItem}>
              <StatCard icon={s.icon} tone={s.tone} eyebrow={s.eyebrow} value={s.value} onClick={() => navigate(s.to)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-h3 font-semibold text-text">Needs a look first</h2>
          {priority.length > 0 && <Badge count={priority.length} tone="warn" />}
        </div>
        {reports.isError ? (
          <Card><QueryError onRetry={() => reports.refetch()} body="We couldn't load the safety queue. This is a load error, not an all-clear." /></Card>
        ) : reports.isLoading ? (
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
