import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { errorMessage } from '@/lib/errors';
import { downloadIcs, formatWhen } from '@/lib/ics';
import { Banner, Button, Card, IconBadge, IconButton, Skeleton, useToasts } from '@/components/ui';
import { PhotoHero } from '@/components/content/PhotoHero';
import type { RsvpStatus } from '@/lib/services/types';

export function EventDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const push = useToasts();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['event', id], queryFn: () => services.events.get(id), enabled: Boolean(id) });
  const e = q.data;

  async function rsvp(status: RsvpStatus) {
    try {
      await services.events.rsvp(id, status);
      await qc.invalidateQueries({ queryKey: ['event', id] });
      await qc.invalidateQueries({ queryKey: ['events'] });
    } catch (err) {
      push({ title: errorMessage(err), variant: 'error' });
    }
  }

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="mx-auto max-w-2xl space-y-5 px-screenX py-6">
      <header className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate(-1)} />
        <h1 className="font-display text-h1 font-bold text-text">Event</h1>
      </header>
      {q.isLoading ? (
        <Skeleton height={160} />
      ) : !e ? (
        <Card><p className="text-body text-textMuted">We couldn't find that event.</p></Card>
      ) : (
        <>
          <PhotoHero photos={e.photos} icon="events" from="var(--c-accent)" to="var(--c-accent-warm)" />
          <Card>
            <div className="flex items-start gap-3">
              <IconBadge icon="events" tone="warn" size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="text-h2 font-semibold text-text">{e.title}</h2>
                <p className="text-small text-textMuted">{formatWhen(e.startsAt)}</p>
                {e.locationText && <p className="text-small text-textMuted">{e.locationText}</p>}
              </div>
            </div>
            {e.description && <p className="mt-3 text-body text-text">{e.description}</p>}
            {e.rsvpMode !== 'none' && (
              <p className="mt-3 text-small text-textMuted">
                {e.goingCount} going{e.rsvpMode === 'capacity' && e.capacity ? ` · ${e.capacity} spaces` : ''}
              </p>
            )}
          </Card>

          {e.myRsvp === 'waitlist' && (
            <Banner tone="warn" icon="info" title="You're on the waitlist" body="We'll move you in if a space opens up." />
          )}

          {e.rsvpMode !== 'none' && (
            <div className="flex flex-wrap gap-2">
              <Button variant={e.myRsvp === 'going' ? 'primary' : 'secondary'} size="sm" leadingIcon="check" onClick={() => rsvp('going')}>
                {e.myRsvp === 'going' ? "You're going" : "I'm going"}
              </Button>
              <Button variant={e.myRsvp === 'maybe' ? 'primary' : 'secondary'} size="sm" onClick={() => rsvp('maybe')}>
                Maybe
              </Button>
              {(e.myRsvp === 'going' || e.myRsvp === 'maybe' || e.myRsvp === 'waitlist') && (
                <Button variant="ghost" size="sm" onClick={() => rsvp('cancelled')}>
                  Can't make it
                </Button>
              )}
            </div>
          )}

          <Button variant="secondary" size="sm" leadingIcon="calendar" onClick={() => downloadIcs(e)}>
            Add to calendar
          </Button>
        </>
      )}
    </motion.div>
  );
}
