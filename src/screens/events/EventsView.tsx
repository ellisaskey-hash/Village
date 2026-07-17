import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { listContainer, listItem } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { EmptyState, QueryError, Skeleton } from '@/components/ui';
import { EventCard } from '@/components/content/EventCard';
import { PeekSheet, type PeekItem } from '@/components/content/PeekSheet';
import type { Event } from '@/lib/services/types';

export function EventsView() {
  const services = useServices();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';
  const [peek, setPeek] = useState<PeekItem | null>(null);
  const q = useQuery({ queryKey: ['events', communityId], queryFn: () => services.events.list(communityId), enabled: Boolean(communityId) });

  const { thisWeek, later } = useMemo(() => {
    const now = Date.now();
    const weekEnd = now + 7 * 864e5;
    const upcoming = (q.data ?? []).filter((e) => new Date(e.startsAt).getTime() >= now - 3600e3).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return {
      thisWeek: upcoming.filter((e) => new Date(e.startsAt).getTime() < weekEnd),
      later: upcoming.filter((e) => new Date(e.startsAt).getTime() >= weekEnd),
    };
  }, [q.data]);

  if (q.isError) return <QueryError onRetry={() => q.refetch()} />;
  if (q.isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={112} />)}</div>;
  if (thisWeek.length === 0 && later.length === 0) {
    return <EmptyState icon="events" title="Nothing on just yet" body="Know something happening locally? Add it so your neighbours can come along." />;
  }

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
    <div className="space-y-6">
      {group('This week', thisWeek)}
      {group('Later on', later)}
      <PeekSheet item={peek} onClose={() => setPeek(null)} />
    </div>
  );
}
