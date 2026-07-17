import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { Chip, EmptyState, QueryError, Select, Skeleton, VirtualList } from '@/components/ui';
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
  const [, setParams] = useSearchParams();

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

  // Column count follows the viewport so desktop shows a real grid, not two giant cards.
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isSm = useMediaQuery('(min-width: 640px)');
  const cols = isLg ? 4 : isSm ? 3 : 2;
  const rows = useMemo(() => {
    const r: Listing[][] = [];
    for (let i = 0; i < filtered.length; i += cols) r.push(filtered.slice(i, i + cols));
    return r;
  }, [filtered, cols]);
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="space-y-4">
      <div className="-mx-screenX flex gap-2 overflow-x-auto px-screenX pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {KINDS.map((k) => (
          <Chip key={k.value} selected={kind === k.value} onClick={() => setKind(k.value)}>{k.label}</Chip>
        ))}
        <span className="mx-1 w-px shrink-0 self-stretch bg-border" />
        <Select
          label="Sort listings"
          hideLabel
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="w-44 shrink-0"
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'priceLow', label: 'Price: low to high' },
            { value: 'priceHigh', label: 'Price: high to low' },
          ]}
        />
      </div>

      {q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <div className="grid gap-3" style={gridStyle}>{Array.from({ length: cols * 2 }).map((_, i) => <Skeleton key={i} height={230} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="listings"
          title={kind === 'all' ? 'Nothing for sale yet' : 'Nothing here'}
          body={kind === 'all' ? 'Got something lying around? Give it a new home with a neighbour.' : 'Try another filter, or be the first to post one.'}
          action={{ label: 'List something', leadingIcon: 'plus', onClick: () => setParams((p) => { p.set('compose', 'sell'); return p; }) }}
        />
      ) : (
        <VirtualList
          items={rows}
          getKey={(row) => row.map((l) => l.id).join('-')}
          estimateSize={248}
          renderItem={(row) => (
            <div className="grid gap-3" style={gridStyle}>
              {row.map((l) => (
                <ListingCard key={l.id} listing={l} onClick={() => setPeek({ kind: 'listing', data: l })} />
              ))}
            </div>
          )}
        />
      )}

      <PeekSheet item={peek} onClose={() => setPeek(null)} />
    </motion.div>
  );
}
