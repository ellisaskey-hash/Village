import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { relativeTime } from '@/lib/ics';
import { cx } from '@/lib/cx';
import { useMediaQuery } from '@/lib/useMediaQuery';
import {
  Badge, Button, Card, EmptyState, IconBadge, InfoCallout, ListRow, QueryError, Sheet, Skeleton, useToasts,
} from '@/components/ui';
import { reasonLabel, kindLabel } from './moderationCopy';
import type { Report, TriageSuggestion } from '@/lib/services/types';

/** Open reports, priority first. On desktop the queue is a master-detail: pick a report and its
 *  detail + advisory triage fill the right pane, deciding auto-advances to the next one so the
 *  queue is never lost. On mobile the detail opens in a bottom sheet (spec 04 §Admin console). */
export function ReportsQueue() {
  const services = useServices();
  const push = useToasts();
  const qc = useQueryClient();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin', 'reports', communityId],
    queryFn: () => services.moderation.reports(communityId),
    enabled: Boolean(communityId),
  });
  const reports = q.data ?? [];
  const selected = reports.find((r) => r.id === openId) ?? null;

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['admin', 'reports', communityId] }),
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard', communityId] }),
      qc.invalidateQueries({ queryKey: ['admin', 'hidden', communityId] }),
    ]);
  }

  async function decide(report: Report, uphold: boolean) {
    try {
      await services.moderation.decide(report.id, uphold);
      push({ title: uphold ? 'Upheld and hidden' : 'Dismissed', variant: 'success' });
      // Desktop: advance to the next report so triage keeps flowing. Mobile: close the sheet.
      if (isDesktop) {
        const idx = reports.findIndex((r) => r.id === report.id);
        setOpenId(reports[idx + 1]?.id ?? null);
      } else {
        setOpenId(null);
      }
      await refresh();
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    }
  }

  const actions = (report: Report) => (
    <div className="flex gap-2">
      <Button variant="secondary" size="xl" fullWidth onClick={() => decide(report, false)}>Dismiss</Button>
      <Button variant="primary" size="xl" fullWidth leadingIcon="eye" onClick={() => decide(report, true)}>Uphold and hide</Button>
    </div>
  );

  if (q.isError) {
    return <Card><QueryError onRetry={() => q.refetch()} body="We couldn't load the reports queue. This is a load error, not an empty queue." /></Card>;
  }
  if (q.isLoading) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={72} />)}</div>;
  }
  if (reports.length === 0) {
    return <Card><EmptyState icon="check" title="No open reports" body="When someone flags a post or a profile, it lands here for review." /></Card>;
  }

  return (
    <>
      <div className="lg:flex lg:items-start lg:gap-5">
        <div className="space-y-2 lg:w-96 lg:shrink-0">
          {reports.map((r) => (
            <ListRow
              key={r.id}
              className={cx(openId === r.id && 'lg:border lg:border-accent')}
              leading={<IconBadge icon={r.priority ? 'flame' : 'shield'} tone={r.priority ? 'warn' : 'accent'} />}
              title={r.targetLabel ?? `${kindLabel(r.targetKind)} report`}
              subtitle={`${reasonLabel(r.reason)} · by ${r.reporterName} · ${relativeTime(r.createdAt)}`}
              trailing={<Badge count={r.reportCount} tone={r.priority ? 'warn' : 'neutral'} />}
              onClick={() => setOpenId(r.id)}
            />
          ))}
        </div>

        {/* Desktop detail pane */}
        <div className="hidden lg:sticky lg:top-6 lg:block lg:min-w-0 lg:flex-1">
          {selected ? (
            <Card className="space-y-4">
              <ReportDetail report={selected} />
              {actions(selected)}
            </Card>
          ) : (
            <Card><EmptyState icon="shield" title="Select a report" body="Pick one from the queue to see the detail, the advisory triage, and decide." /></Card>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <Sheet
        open={!isDesktop && Boolean(selected)}
        onClose={() => setOpenId(null)}
        title="Report"
        hero={{ icon: selected?.priority ? 'flame' : 'shield', tone: selected?.priority ? 'warn' : 'accent' }}
        footer={selected && actions(selected)}
      >
        {selected && <ReportDetail report={selected} />}
      </Sheet>
    </>
  );
}

function ReportDetail({ report }: { report: Report }) {
  const services = useServices();
  const triage = useQuery({
    queryKey: ['admin', 'triage', report.id],
    queryFn: () => services.moderation.triage(report.id),
  });
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-h3 font-semibold text-text">{report.targetLabel ?? kindLabel(report.targetKind)}</p>
        <p className="text-small text-textMuted">
          {kindLabel(report.targetKind)} · reported as {reasonLabel(report.reason).toLowerCase()} · {report.reportCount} {report.reportCount === 1 ? 'report' : 'reports'}
        </p>
      </div>

      {report.priority && (
        <InfoCallout icon="alert" tone="warn" heading="Flagged as a possible safety concern">
          This was reported as someone possibly being at risk. Look at it first. We signpost the
          reporter to 999, 101, Childline and Samaritans, but the platform does not handle
          emergencies.
        </InfoCallout>
      )}

      {report.note && (
        <Card>
          <p className="text-eyebrow uppercase text-textMuted">Reporter's note</p>
          <p className="mt-1 text-body text-text">{report.note}</p>
        </Card>
      )}

      <TriageCard triage={triage.data} loading={triage.isLoading} />
    </div>
  );
}

function TriageCard({ triage, loading }: { triage: TriageSuggestion | undefined; loading: boolean }) {
  if (loading) return <Skeleton height={80} />;
  if (!triage) return null;
  const tone = triage.recommendation === 'hide' ? 'warn' : triage.recommendation === 'watch' ? 'accent' : 'neutral';
  const verb = triage.recommendation === 'hide' ? 'Consider hiding' : triage.recommendation === 'watch' ? 'Keep watching' : 'Likely fine';
  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2">
        <IconBadge icon="sparkle" tone={tone} size="sm" />
        <span className="text-eyebrow uppercase text-textMuted">Advisory suggestion</span>
        {triage.fixture && <Badge tone="neutral" dot />}
      </div>
      <p className="text-body font-medium text-text">{verb}</p>
      <p className="text-small text-textMuted">{triage.rationale}</p>
      <p className="text-small text-textFaint">
        {triage.fixture
          ? 'Rule-based suggestion (no AI key set yet). Advisory only. You decide.'
          : 'AI suggestion. Advisory only. You decide.'}
      </p>
    </Card>
  );
}
