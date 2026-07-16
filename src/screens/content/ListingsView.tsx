import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { Chip, EmptyState, QueryError, Skeleton, VirtualList } from '@/components/ui';
import { ListingCard, priceBadge } from '@/components/content/ListingCard';
import { PeekSheet, type PeekItem } from '@/components/content/PeekSheet';
import type { Listing, ListingKind } from '@/lib/services/types';

/** Kept for detail screens that import it. */
export const priceLabel = priceBadge;

type KindFilter = 'all' | ListingKind;
type Sort = 'newest' | 'priceLow' | 'priceHigh';

const KINDS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'sell', label: 'For sale' },
  { value: 'free', label: 'Free' },
  { value: 'wanted', label: 'Wanted' },
  { value: 'lend', label: 'To borrow' },
];

export function ListingsView() {
  const services = useServices();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';
  const [kind, setKind] = useState<KindFilter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [peek, setPeek] = useState<PeekItem | null>(null);

  const q = useQuery({
    queryKey: ['listings', communityId],
    queryFn: () => services.listings.list(communityId),
    enabled: Boolean(communityId),
  });

  const filtered = useMemo(() => {
    let list = (q.data ?? []).slice();
    if (kind !== 'all') list = list.filter((l) => l.kind === kind);
    if (sort === 'priceLow') list.sort((a, b) => (a.pricePence ?? Infinity) - (b.pricePence ?? Infinity));
    else if (sort === 'priceHigh') list.sort((a, b) => (b.pricePence ?? -1) - (a.pricePence ?? -1));
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [q.data, kind, sort]);

  const rows = useMemo(() => {
    const r: Listing[][] = [];
    for (let i = 0; i < filtered.length; i += 2) r.push(filtered.slice(i, i + 2));
    return r;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="-mx-screenX flex gap-2 overflow-x-auto px-screenX pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {KINDS.map((k) => (
          <Chip key={k.value} selected={kind === k.value} onClick={() => setKind(k.value)}>{k.label}</Chip>
        ))}
        <span className="mx-1 w-px shrink-0 self-stretch bg-border" />
        <Chip selected={sort !== 'newest'} leadingIcon="filter" onClick={() => setSort((s) => (s === 'newest' ? 'priceLow' : s === 'priceLow' ? 'priceHigh' : 'newest'))}>
          {sort === 'newest' ? 'Newest' : sort === 'priceLow' ? 'Price ↑' : 'Price ↓'}
        </Chip>
      </div>

      {q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={230} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="listings" title={kind === 'all' ? 'Nothing for sale yet' : 'Nothing here'} body={kind === 'all' ? 'Got something lying around? Give it a new home with a neighbour.' : 'Try another filter, or be the first to post one.'} />
      ) : (
        <VirtualList
          items={rows}
          getKey={(row) => row.map((l) => l.id).join('-')}
          estimateSize={248}
          renderItem={(row) => (
            <div className="grid grid-cols-2 gap-3">
              {row.map((l) => (
                <ListingCard key={l.id} listing={l} onClick={() => setPeek({ kind: 'listing', data: l })} />
              ))}
            </div>
          )}
        />
      )}

      <PeekSheet item={peek} onClose={() => setPeek(null)} />
    </div>
  );
}
