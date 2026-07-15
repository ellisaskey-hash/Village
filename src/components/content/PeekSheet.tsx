import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { errorMessage } from '@/lib/errors';
import { Button, Icon, Sheet, useToasts } from '@/components/ui';
import { PhotoHero } from '@/components/content/PhotoHero';
import { priceBadge } from '@/components/content/ListingCard';
import { formatWhen } from '@/lib/ics';
import type { Event, Listing, RequestPost } from '@/lib/services/types';

export type PeekItem =
  | { kind: 'listing'; data: Listing }
  | { kind: 'event'; data: Event }
  | { kind: 'request'; data: RequestPost };

/** The peek drawer (Elevra's canonical browse affordance, PATTERNS.md §List/detail): tap a card
 *  → a bottom-sheet summary with a quick action, keeping list context. "View" opens the full
 *  page. Events RSVP inline from the peek. */
export function PeekSheet({ item, onClose }: { item: PeekItem | null; onClose: () => void }) {
  const navigate = useNavigate();
  const services = useServices();
  const push = useToasts();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (!item) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  function go(path: string) {
    onClose();
    navigate(path);
  }

  async function rsvp(eventId: string, communityId: string) {
    setBusy(true);
    try {
      await services.events.rsvp(eventId, 'going');
      await qc.invalidateQueries({ queryKey: ['events', communityId] });
      push({ title: "You're going", variant: 'success' });
      onClose();
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (item.kind === 'listing') {
    const l = item.data;
    return (
      <Sheet open onClose={onClose} title={l.title} hero={{ icon: 'listings', tone: l.kind === 'free' ? 'positive' : 'accent' }}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="xl" fullWidth onClick={() => go(`/listings/${l.id}`)}>View listing</Button>
            <Button variant="primary" size="xl" fullWidth leadingIcon="messages" onClick={() => go(`/listings/${l.id}`)}>Message</Button>
          </div>
        }>
        <div className="space-y-3">
          <PhotoHero photos={l.photos} icon="listings" />
          <div className="flex items-center gap-2">
            <span className="rounded-pill border border-border bg-bgElevated px-2.5 py-1 text-small font-semibold text-text">{priceBadge(l)}</span>
            <span className="text-small text-textMuted">{l.authorName}</span>
          </div>
          {l.description && <p className="text-body text-text">{l.description}</p>}
        </div>
      </Sheet>
    );
  }

  if (item.kind === 'event') {
    const e = item.data;
    const going = e.myRsvp === 'going';
    return (
      <Sheet open onClose={onClose} title={e.title} hero={{ icon: 'events', tone: 'warn' }}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" size="xl" fullWidth onClick={() => go(`/events/${e.id}`)}>View event</Button>
            <Button variant={going ? 'secondary' : 'primary'} size="xl" fullWidth loading={busy} disabled={going} leadingIcon={going ? 'check' : 'people'} onClick={() => rsvp(e.id, e.communityId)}>
              {going ? 'Going' : "I'm going"}
            </Button>
          </div>
        }>
        <div className="space-y-3">
          <PhotoHero photos={e.photos} icon="events" />
          <p className="flex items-center gap-2 text-body text-text"><Icon name="calendar" size={16} className="text-accent" /> {formatWhen(e.startsAt)}</p>
          {e.locationText && <p className="flex items-center gap-2 text-small text-textMuted"><Icon name="pin" size={16} className="text-textFaint" /> {e.locationText}</p>}
          <p className="text-small text-textMuted">{e.goingCount} going</p>
          {e.description && <p className="text-body text-text">{e.description}</p>}
        </div>
      </Sheet>
    );
  }

  const r = item.data;
  return (
    <Sheet open onClose={onClose} title={r.title} hero={{ icon: 'requests', tone: 'accent' }}
      footer={<Button variant="primary" size="xl" fullWidth leadingIcon="requests" onClick={() => go(`/requests/${r.id}`)}>I can help</Button>}>
      <div className="space-y-2">
        <p className="text-small text-textMuted">{r.category} · {r.authorName}</p>
        {r.description && <p className="text-body text-text">{r.description}</p>}
      </div>
    </Sheet>
  );
}
