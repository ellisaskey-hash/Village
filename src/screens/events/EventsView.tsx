import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { listContainer, listItem, screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { Chip, EmptyState, QueryError, Skeleton } from '@/components/ui';
import { EventCard } from '@/components/content/EventCard';
import { PeekSheet, type PeekItem } from '@/components/content/PeekSheet';
import { EVENT_CATEGORY_LABEL } from '@/lib/labels';
import type { Event, EventCategory } from '@/lib/services/types';

type CatFilter = 'all' | EventCategory;
const CATS: { value: CatFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...(Object.keys(EVENT_CATEGORY_LABEL) as EventCategory[]).map((value) => ({ value, label: EVENT_CATEGORY_LABEL[value] })),
];

export function EventsView() {
  const services = useServices();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';
  const [peek, setPeek] = useState<PeekItem | null>(null);
  const [cat, setCat] = useState<CatFilter>('all');
  const [, setParams] = useSearchParams();
  const q = useQuery({ queryKey: ['events', communityId], queryFn: () => services.events.list(communityId), enabled: Boolean(communityId) });

  const buckets = useMemo(() => {
    const now = Date.now();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const todayStart = startOfDay(new Date());
    const tomorrowStart = todayStart + 864e5;
    const dayAfter = todayStart + 2 * 864e5;
    const weekEnd = todayStart + 7 * 864e5;

    const upcoming = (q.data ?? [])
      .filter((e) => new Date(e.startsAt).getTime() >= now - 3600e3)
      .filter((e) => cat === 'all' || e.category === cat)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    const at = (e: Event) => new Date(e.startsAt).getTime();
    return {
      today: upcoming.filter((e) => at(e) < tomorrowStart),
      tomorrow: upcoming.filter((e) => at(e) >= tomorrowStart && at(e) < dayAfter),
      thisWeek: upcoming.filter((e) => at(e) >= dayAfter && at(e) < weekEnd),
      later: upcoming.filter((e) => at(e) >= weekEnd),
      total: upcoming.length,
    };
  }, [q.data, cat]);

  const filters = (
    <div className="-mx-screenX flex gap-2 overflow-x-auto px-screenX pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CATS.map((c) => (
        <Chip key={c.value} selected={cat === c.value} onClick={() => setCat(c.value)}>{c.label}</Chip>
      ))}
    </div>
  );

  const group = (title: string, events: Event[]) =>
    events.length > 0 && (
      <section className="space-y-3">
        <h3 className="text-eyebrow uppercase text-textMuted">{title}</h3>
        <motion.div variants={listContainer} initial="initial" animate="animate" className="space-y-3">
          {events.map((e) => (
            <motion.div key={e.id} variants={listItem}>
              <EventCard event={e} onClick={() => setPeek({ kind: 'event', data: e })} />
            </motion.div>
          ))}
        </motion.div>
      </section>
    );

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="space-y-4">
      {filters}
      {q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={112} />)}</div>
      ) : buckets.total === 0 ? (
        <EmptyState
          icon="events"
          title={cat === 'all' ? 'Nothing on just yet' : 'Nothing in this one'}
          body={cat === 'all' ? 'Know something happening locally? Add it so your neighbours can come along.' : 'Try another category, or add the first one.'}
          action={{ label: 'Add an event', leadingIcon: 'plus', onClick: () => setParams((p) => { p.set('compose', 'event'); return p; }) }}
        />
      ) : (
        <div className="space-y-6">
          {group('Today', buckets.today)}
          {group('Tomorrow', buckets.tomorrow)}
          {group('This week', buckets.thisWeek)}
          {group('Later on', buckets.later)}
        </div>
      )}
      <PeekSheet item={peek} onClose={() => setPeek(null)} />
    </motion.div>
  );
}
