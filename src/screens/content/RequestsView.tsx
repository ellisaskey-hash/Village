import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { Chip, EmptyState, IconBadge, ListRow, QueryError, Skeleton, VirtualList } from '@/components/ui';
import { PeekSheet, type PeekItem } from '@/components/content/PeekSheet';
import { REQUEST_CATEGORY_LABEL, labelFor } from '@/lib/labels';
import type { RequestCategory, RequestStatus } from '@/lib/services/types';

const STATUS_LABEL: Record<RequestStatus, string> = {
  open: 'Open', answered: 'Answered', fulfilled: 'Sorted', expired: 'Expired', withdrawn: 'Withdrawn',
};

type CatFilter = 'all' | RequestCategory;
const CATS: { value: CatFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'help', label: 'A hand' },
  { value: 'trades', label: 'Trades' },
  { value: 'lifts', label: 'Lifts' },
  { value: 'recommendations', label: 'Recs' },
  { value: 'borrow', label: 'Borrow' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'pets', label: 'Pets' },
];

export function RequestsView() {
  const services = useServices();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';
  const [cat, setCat] = useState<CatFilter>('all');
  const [peek, setPeek] = useState<PeekItem | null>(null);

  const q = useQuery({
    queryKey: ['requests', communityId],
    queryFn: () => services.requests.list(communityId),
    enabled: Boolean(communityId),
  });

  const filtered = useMemo(() => {
    const list = (q.data ?? []).filter((r) => cat === 'all' || r.category === cat);
    // Open first, then by recency.
    return list.sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || b.createdAt.localeCompare(a.createdAt));
  }, [q.data, cat]);

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="space-y-4">
      <div className="-mx-screenX flex gap-2 overflow-x-auto px-screenX pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATS.map((c) => (
          <Chip key={c.value} selected={cat === c.value} onClick={() => setCat(c.value)}>{c.label}</Chip>
        ))}
      </div>

      {q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={64} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="requests" title={cat === 'all' ? 'Nobody needs a hand right now' : 'Nothing in this one'} body="Ask for one. Lifts, tools, recommendations, a spare pair of hands." />
      ) : (
        <VirtualList
          items={filtered}
          getKey={(r) => r.id}
          estimateSize={72}
          renderItem={(r) => (
            <ListRow
              leading={<IconBadge icon="requests" tone={r.status === 'open' ? 'accent' : 'neutral'} />}
              title={r.title}
              subtitle={`${labelFor(REQUEST_CATEGORY_LABEL, r.category)} · ${r.authorName}`}
              trailing={<Chip tone={r.status === 'fulfilled' ? 'positive' : 'neutral'} selected={r.status !== 'open'}>{STATUS_LABEL[r.status]}</Chip>}
              onClick={() => setPeek({ kind: 'request', data: r })}
            />
          )}
        />
      )}

      <PeekSheet item={peek} onClose={() => setPeek(null)} />
    </motion.div>
  );
}
