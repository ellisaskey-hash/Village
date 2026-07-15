import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useActiveMembership, useSession } from '@/app/state/session';
import { useServices } from '@/lib/services/provider';
import { formatWhen } from '@/lib/ics';
import { Badge, Button, Card, EmptyState, Icon, IconBadge, PullToRefresh, Skeleton, StaggeredBody, type IconName } from '@/components/ui';
import { ListingCard } from '@/components/content/ListingCard';
import { AlertsStrip } from '@/screens/AlertsStrip';

const QUICK: { icon: IconName; label: string; to: string }[] = [
  { icon: 'requests', label: 'Ask for a hand', to: '/explore?tab=requests' },
  { icon: 'listings', label: 'List something', to: '/explore?tab=listings' },
  { icon: 'alerts', label: 'Report something lost', to: '/explore' },
];

function SectionHeader({ title, to, onSeeAll }: { title: string; to?: string; onSeeAll?: () => void }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-h3 font-semibold text-text">{title}</h2>
      {to && onSeeAll && (
        <button type="button" onClick={onSeeAll} className="text-small font-medium text-accent hover:underline">
          See all
        </button>
      )}
    </div>
  );
}

export function HomeScreen() {
  const session = useSession();
  const active = useActiveMembership();
  const navigate = useNavigate();
  const services = useServices();
  const qc = useQueryClient();
  const communityId = active?.communityId ?? '';
  const firstName = session?.profile.displayName.split(' ')[0] ?? 'neighbour';

  const eventsQ = useQuery({ queryKey: ['events', communityId], queryFn: () => services.events.list(communityId), enabled: Boolean(communityId) });
  const requestsQ = useQuery({ queryKey: ['requests', communityId], queryFn: () => services.requests.list(communityId), enabled: Boolean(communityId) });
  const listingsQ = useQuery({ queryKey: ['listings', communityId], queryFn: () => services.listings.list(communityId), enabled: Boolean(communityId) });
  const noticesQ = useQuery({ queryKey: ['noticeboard', communityId], queryFn: () => services.directory.noticeboard(communityId), enabled: Boolean(communityId) });

  const loading = eventsQ.isLoading || requestsQ.isLoading || listingsQ.isLoading;
  const soon = (eventsQ.data ?? []).filter((e) => new Date(e.startsAt) >= new Date(Date.now() - 3600e3)).slice(0, 3);
  const openRequests = (requestsQ.data ?? []).filter((r) => r.status === 'open' || r.status === 'answered').slice(0, 4);
  const freshListings = (listingsQ.data ?? []).filter((l) => l.status === 'active').slice(0, 8);
  const notices = (noticesQ.data ?? []).slice(0, 3);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ['events', communityId] });
    await qc.invalidateQueries({ queryKey: ['requests', communityId] });
    await qc.invalidateQueries({ queryKey: ['listings', communityId] });
    await qc.invalidateQueries({ queryKey: ['noticeboard', communityId] });
    await qc.invalidateQueries({ queryKey: ['alerts', communityId] });
  }

  async function rsvp(eventId: string) {
    await services.events.rsvp(eventId, 'going');
    await qc.invalidateQueries({ queryKey: ['events', communityId] });
  }

  return (
    <PullToRefresh onRefresh={refresh}>
      <motion.div variants={screenEnter} initial="initial" animate="animate" className="mx-auto max-w-2xl space-y-sectionGap px-screenX py-6">
        <header>
          <p className="text-eyebrow uppercase text-textMuted">{active?.name ?? 'Your community'}</p>
          <h1 className="font-display text-h1 font-bold text-text">Good to see you, {firstName}</h1>
        </header>

        <AlertsStrip />

        {loading && (
          <div className="space-y-3">
            <Skeleton height={44} />
            <div className="flex gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} width={224} height={200} />)}</div>
          </div>
        )}

        {soon.length > 0 && (
          <section className="space-y-3">
            <SectionHeader title="Happening soon" to="/explore?tab=events" onSeeAll={() => navigate('/explore?tab=events')} />
            <div className="space-y-2">
              {soon.map((ev) => (
                <Card key={ev.id} variant="pressable" onClick={() => navigate(`/events/${ev.id}`)} className="flex items-center gap-3">
                  <IconBadge icon="events" tone="warn" size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-text">{ev.title}</p>
                    <p className="text-small text-textMuted">{formatWhen(ev.startsAt)} · {ev.goingCount} going</p>
                  </div>
                  <Button
                    variant={ev.myRsvp === 'going' ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); if (ev.myRsvp !== 'going') void rsvp(ev.id); }}
                    disabled={ev.myRsvp === 'going'}
                  >
                    {ev.myRsvp === 'going' ? 'Going' : "I'm going"}
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <SectionHeader title="Needs a hand" to="/explore?tab=requests" onSeeAll={() => navigate('/explore?tab=requests')} />
          {openRequests.length > 0 ? (
            <div className="space-y-2">
              {openRequests.map((r) => (
                <Card key={r.id} variant="pressable" onClick={() => navigate(`/requests/${r.id}`)} className="flex items-center gap-3">
                  <IconBadge icon="requests" tone="accent" size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-text">{r.title}</p>
                    <p className="text-small text-textMuted">{r.category} · {r.authorName}</p>
                  </div>
                  <Icon name="requests" size={18} className="text-textFaint" />
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon="requests" title="Nobody needs a hand right now" body="Be the first to ask. Neighbours are quick to help with lifts, tools and recommendations." action={{ label: 'Ask for a hand', onClick: () => navigate('/explore?tab=requests'), leadingIcon: 'plus' }} />
          )}
        </section>

        {freshListings.length > 0 && (
          <section className="space-y-3">
            <SectionHeader title="New in the village" to="/explore?tab=listings" onSeeAll={() => navigate('/explore?tab=listings')} />
            <div className="-mx-screenX flex gap-3 overflow-x-auto px-screenX pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {freshListings.map((l) => (
                <ListingCard key={l.id} listing={l} variant="compact" onClick={() => navigate(`/listings/${l.id}`)} />
              ))}
            </div>
          </section>
        )}

        {notices.length > 0 && (
          <section className="space-y-3">
            <SectionHeader title="From the noticeboard" />
            <div className="space-y-2">
              {notices.map((n) => (
                <Card key={n.id} className="border-l-4 border-l-accent">
                  <div className="flex items-center gap-2">
                    <p className="text-small font-semibold text-text">{n.organisationName}</p>
                    {n.verified && <Badge tone="positive" dot />}
                  </div>
                  <p className="mt-1 text-body font-medium text-text">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-small text-textMuted">{n.body}</p>}
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader title="Quick actions" />
          <StaggeredBody className="mt-2 grid grid-cols-3 gap-3">
            {QUICK.map((qk) => (
              <button key={qk.label} type="button" onClick={() => navigate(qk.to)} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-bgElevated p-4 text-center transition-colors hover:border-accent/40">
                <IconBadge icon={qk.icon} tone="accent" size="md" />
                <span className="text-small font-medium text-text">{qk.label}</span>
              </button>
            ))}
          </StaggeredBody>
        </section>
      </motion.div>
    </PullToRefresh>
  );
}
