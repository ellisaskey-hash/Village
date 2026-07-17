import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cardEnter, screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { errorMessage } from '@/lib/errors';
import { downloadIcs, formatWhen } from '@/lib/ics';
import { Banner, Button, Card, Icon, IconBadge, IconButton, QueryError, Skeleton, useToasts } from '@/components/ui';
import { PhotoHero } from '@/components/content/PhotoHero';
import { AuthorCard } from '@/components/content/AuthorCard';
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
      <motion.header variants={cardEnter} className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate(-1)} />
        <p className="text-eyebrow uppercase text-textMuted">Event</p>
      </motion.header>
      {q.isLoading ? (
        <div className="space-y-4"><Skeleton height={208} /><Skeleton height={120} /></div>
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : !e ? (
        <Card><p className="text-body text-textMuted">We couldn't find that event.</p></Card>
      ) : (
        <>
          <motion.div variants={cardEnter}>
            <PhotoHero photos={e.photos} icon="events" from="var(--c-accent)" to="var(--c-accent-warm)" />
          </motion.div>
          <motion.div variants={cardEnter}>
            <Card>
              <div className="flex items-start gap-3">
                <IconBadge icon="events" tone="warn" size="lg" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-h2 font-semibold text-text">{e.title}</h1>
                  <p className="flex items-center gap-1.5 text-small text-textMuted"><Icon name="calendar" size={14} className="text-accent" /> {formatWhen(e.startsAt)}</p>
                  {e.locationText && <p className="flex items-center gap-1.5 text-small text-textMuted"><Icon name="pin" size={14} className="text-textFaint" /> {e.locationText}</p>}
                </div>
              </div>
              {e.description && <p className="mt-3 text-body text-text">{e.description}</p>}
              {e.rsvpMode !== 'none' && (
                <p className="mt-3 text-small text-textMuted">{e.goingCount} going{e.rsvpMode === 'capacity' && e.capacity ? ` · ${e.capacity} spaces` : ''}</p>
              )}
            </Card>
          </motion.div>

          <motion.div variants={cardEnter}>
            <AuthorCard communityId={e.communityId} profileId={e.createdBy} fallbackName={e.authorName} />
          </motion.div>

          {e.myRsvp === 'waitlist' && (
            <motion.div variants={cardEnter}>
              <Banner tone="warn" icon="info" title="You're on the waitlist" body="We'll move you in if a space opens up." />
            </motion.div>
          )}

          <motion.div variants={cardEnter} className="space-y-2">
            {e.rsvpMode !== 'none' && (
              <div className="flex flex-wrap gap-2">
                <Button variant={e.myRsvp === 'going' ? 'primary' : 'secondary'} size="sm" leadingIcon="check" onClick={() => rsvp('going')}>
                  {e.myRsvp === 'going' ? "You're going" : "I'm going"}
                </Button>
                <Button variant={e.myRsvp === 'maybe' ? 'primary' : 'secondary'} size="sm" onClick={() => rsvp('maybe')}>Maybe</Button>
                {(e.myRsvp === 'going' || e.myRsvp === 'maybe' || e.myRsvp === 'waitlist') && (
                  <Button variant="ghost" size="sm" onClick={() => rsvp('cancelled')}>Can't make it</Button>
                )}
              </div>
            )}
            <Button variant="secondary" size="sm" leadingIcon="calendar" onClick={() => downloadIcs(e)}>Add to calendar</Button>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
