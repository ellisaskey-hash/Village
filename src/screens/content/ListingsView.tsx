import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { EmptyState, Skeleton, VirtualList } from '@/components/ui';
import { ListingCard, priceBadge } from '@/components/content/ListingCard';
import type { Listing } from '@/lib/services/types';

/** Kept for detail screens that import it. */
export const priceLabel = priceBadge;

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

  if (q.isLoading) return <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={230} />)}</div>;
  if (!q.data || q.data.length === 0) {
    return (
      <EmptyState
        icon="listings"
        title="Nothing for sale yet"
        body="Got something lying around? Give it a new home with a neighbour."
      />
    );
  }
  // Two-column photo grid, windowed a row (of two) at a time for long lists.
  const rows: Listing[][] = [];
  for (let i = 0; i < q.data.length; i += 2) rows.push(q.data.slice(i, i + 2));
  return (
    <VirtualList
      items={rows}
      getKey={(row) => row.map((l) => l.id).join('-')}
      estimateSize={248}
      renderItem={(row) => (
        <div className="grid grid-cols-2 gap-3">
          {row.map((l) => (
            <ListingCard key={l.id} listing={l} onClick={() => navigate(`/listings/${l.id}`)} />
          ))}
        </div>
      )}
    />
  );
}
