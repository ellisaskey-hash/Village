import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { Badge, EmptyState, IconBadge, ListRow, Skeleton, VirtualList } from '@/components/ui';
import type { Listing } from '@/lib/services/types';

export function priceLabel(l: Listing): string {
  if (l.kind === 'free') return 'Free';
  if (l.kind === 'wanted') return 'Wanted';
  if (l.kind === 'lend') return 'To borrow';
  return l.pricePence != null ? `£${(l.pricePence / 100).toFixed(2)}` : 'For sale';
}

export function ListingsView() {
  const services = useServices();
  const navigate = useNavigate();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';
  const q = useQuery({
    queryKey: ['listings', communityId],
    queryFn: () => services.listings.list(communityId),
    enabled: Boolean(communityId),
  });

  if (q.isLoading) return <Skeleton height={72} />;
  if (!q.data || q.data.length === 0) {
    return (
      <EmptyState
        icon="listings"
        title="Nothing for sale yet"
        body="Got something lying around? Give it a new home with a neighbour."
      />
    );
  }
  return (
    <VirtualList
      items={q.data}
      getKey={(l) => l.id}
      estimateSize={72}
      renderItem={(l) => (
        <ListRow
          leading={<IconBadge icon="listings" tone={l.kind === 'free' ? 'positive' : 'accent'} />}
          title={l.title}
          subtitle={`${priceLabel(l)} · ${l.authorName}`}
          trailing={l.status !== 'active' ? <Badge tone="warn" count={0} dot /> : undefined}
          onClick={() => navigate(`/listings/${l.id}`)}
        />
      )}
    />
  );
}
