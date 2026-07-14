import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useActiveMembership, useSession } from '@/app/state/session';
import { useServices } from '@/lib/services/provider';
import { formatWhen } from '@/lib/ics';
import { Card, EmptyState, IconBadge, ListRow, StaggeredBody, type IconName } from '@/components/ui';
import { AlertsStrip } from '@/screens/AlertsStrip';

const QUICK: { icon: IconName; label: string; to: string }[] = [
  { icon: 'requests', label: 'Ask for a hand', to: '/explore?tab=requests' },
  { icon: 'listings', label: 'List something', to: '/explore?tab=listings' },
  { icon: 'alerts', label: 'Report something lost', to: '/explore' },
];

export function HomeScreen() {
  const session = useSession();
  const active = useActiveMembership();
  const navigate = useNavigate();
  const services = useServices();
  const communityId = active?.communityId ?? '';
  const firstName = session?.profile.displayName.split(' ')[0] ?? 'neighbour';

  const eventsQ = useQuery({
    queryKey: ['events', communityId],
    queryFn: () => services.events.list(communityId),
    enabled: Boolean(communityId),
  });
  const requestsQ = useQuery({
    queryKey: ['requests', communityId],
    queryFn: () => services.requests.list(communityId),
    enabled: Boolean(communityId),
  });
  const listingsQ = useQuery({
    queryKey: ['listings', communityId],
    queryFn: () => services.listings.list(communityId),
    enabled: Boolean(communityId),
  });
  const soon = (eventsQ.data ?? [])
    .filter((e) => new Date(e.startsAt) >= new Date(Date.now() - 3600e3))
    .slice(0, 3);
  const openRequests = (requestsQ.data ?? []).filter((r) => r.status === 'open' || r.status === 'answered').slice(0, 3);
  const freshListings = (listingsQ.data ?? []).filter((l) => l.status === 'active').slice(0, 4);

  return (
    <motion.div
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-2xl space-y-sectionGap px-screenX py-6"
    >
      <header>
        <p className="text-eyebrow uppercase text-textMuted">{active?.name ?? 'Your community'}</p>
        <h1 className="font-display text-h1 font-bold text-text">Good to see you, {firstName}</h1>
      </header>

      <AlertsStrip />

      <section>
        <h2 className="mb-2 text-h3 font-semibold text-text">Quick actions</h2>
        <StaggeredBody className="grid grid-cols-3 gap-3">
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => navigate(q.to)}
              className="flex flex-col items-center gap-2 rounded-lg border border-border bg-bgElevated p-4 text-center transition-colors hover:border-accent/40"
            >
              <IconBadge icon={q.icon} tone="accent" size="md" />
              <span className="text-small font-medium text-text">{q.label}</span>
            </button>
          ))}
        </StaggeredBody>
      </section>

      {soon.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-h3 font-semibold text-text">Happening soon</h2>
          <div className="space-y-2">
            {soon.map((ev) => (
              <ListRow
                key={ev.id}
                leading={<IconBadge icon="events" tone="warn" />}
                title={ev.title}
                subtitle={formatWhen(ev.startsAt)}
                onClick={() => navigate(`/events/${ev.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-h3 font-semibold text-text">Needs a hand</h2>
        {openRequests.length > 0 ? (
          <div className="space-y-2">
            {openRequests.map((r) => (
              <ListRow
                key={r.id}
                leading={<IconBadge icon="requests" tone="accent" />}
                title={r.title}
                subtitle={`${r.category} · ${r.authorName}`}
                onClick={() => navigate(`/requests/${r.id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="requests"
            title="Nobody needs a hand right now"
            body="Be the first to ask. Neighbours are quick to help with lifts, tools and recommendations."
            action={{ label: 'Ask for a hand', onClick: () => navigate('/explore?tab=requests'), leadingIcon: 'plus' }}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-h3 font-semibold text-text">New in the village</h2>
        {freshListings.length > 0 ? (
          <div className="space-y-2">
            {freshListings.map((l) => (
              <ListRow
                key={l.id}
                leading={<IconBadge icon="listings" tone={l.kind === 'free' ? 'positive' : 'accent'} />}
                title={l.title}
                subtitle={`${l.kind === 'free' ? 'Free' : l.kind === 'wanted' ? 'Wanted' : l.kind === 'lend' ? 'To borrow' : l.pricePence != null ? `£${(l.pricePence / 100).toFixed(2)}` : 'For sale'} · ${l.authorName}`}
                onClick={() => navigate(`/listings/${l.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-body text-textMuted">
              Nothing listed yet in {active?.name ?? 'your community'}. Got something to sell, give
              away or lend? Tap the plus.
            </p>
          </Card>
        )}
      </section>
    </motion.div>
  );
}
