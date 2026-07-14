import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { Chip, EmptyState, IconBadge, ListRow, Skeleton } from '@/components/ui';
import type { RequestStatus } from '@/lib/services/types';

const STATUS_LABEL: Record<RequestStatus, string> = {
  open: 'Open',
  answered: 'Answered',
  fulfilled: 'Sorted',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
};

export function RequestsView() {
  const services = useServices();
  const navigate = useNavigate();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';
  const q = useQuery({
    queryKey: ['requests', communityId],
    queryFn: () => services.requests.list(communityId),
    enabled: Boolean(communityId),
  });

  if (q.isLoading) return <Skeleton height={72} />;
  if (!q.data || q.data.length === 0) {
    return (
      <EmptyState
        icon="requests"
        title="Nobody needs a hand right now"
        body="Ask for one. Lifts, tools, recommendations, a spare pair of hands."
      />
    );
  }
  return (
    <div className="space-y-2">
      {q.data.map((r) => (
        <ListRow
          key={r.id}
          leading={<IconBadge icon="requests" tone={r.status === 'open' ? 'accent' : 'neutral'} />}
          title={r.title}
          subtitle={`${r.category} · ${r.authorName}`}
          trailing={
            <Chip tone={r.status === 'fulfilled' ? 'positive' : 'neutral'} selected={r.status !== 'open'}>
              {STATUS_LABEL[r.status]}
            </Chip>
          }
          onClick={() => navigate(`/requests/${r.id}`)}
        />
      ))}
    </div>
  );
}
