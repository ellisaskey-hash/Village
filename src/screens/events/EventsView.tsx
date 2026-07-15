import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { EmptyState, Skeleton } from '@/components/ui';
import { EventCard } from '@/components/content/EventCard';

export function EventsView() {
  const services = useServices();
  const navigate = useNavigate();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';
  const q = useQuery({
    queryKey: ['events', communityId],
    queryFn: () => services.events.list(communityId),
    enabled: Boolean(communityId),
  });

  if (q.isLoading) return <Skeleton height={72} />;
  const upcoming = (q.data ?? []).filter((e) => new Date(e.startsAt) >= new Date(Date.now() - 3600e3));
  if (upcoming.length === 0) {
    return (
      <EmptyState
        icon="events"
        title="Nothing on just yet"
        body="Know something happening locally? Add it so your neighbours can come along."
      />
    );
  }
  return (
    <div className="space-y-3">
      {upcoming.map((e) => (
        <EventCard key={e.id} event={e} onClick={() => navigate(`/events/${e.id}`)} />
      ))}
    </div>
  );
}
