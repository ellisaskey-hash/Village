import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Field, SegmentedControl, Select, Sheet, Textarea, useToasts } from '@/components/ui';
import { StaggeredBody } from '@/components/ui';
import { PhotoInput } from '@/components/content/PhotoInput';
import { ActingAsSelector } from '@/components/content/ActingAsSelector';
import type { EventCategory, RsvpMode } from '@/lib/services/types';

const CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'community', label: 'Community' },
  { value: 'school', label: 'School' },
  { value: 'sport', label: 'Sport' },
  { value: 'club', label: 'Club' },
  { value: 'church', label: 'Church' },
  { value: 'market', label: 'Market' },
  { value: 'other', label: 'Other' },
];

export function EventComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const services = useServices();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const push = useToasts();
  const active = useActiveMembership();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('community');
  const [startsAt, setStartsAt] = useState('');
  const [locationText, setLocationText] = useState('');
  const [description, setDescription] = useState('');
  const [rsvpMode, setRsvpMode] = useState<RsvpMode>('open');
  const [capacity, setCapacity] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [asBusinessId, setAsBusinessId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Local-time "now" as the min for the datetime picker so past dates can't be chosen.
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const minDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  async function submit() {
    if (!active) return;
    if (startsAt && new Date(startsAt).getTime() < Date.now()) {
      push({ title: 'Pick a date and time in the future', variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const cap = rsvpMode === 'capacity' && capacity ? parseInt(capacity, 10) : undefined;
      const ev = await services.events.create(active.communityId, {
        title,
        category,
        startsAt: startsAt ? new Date(startsAt).toISOString() : '',
        rsvpMode,
        ...(locationText ? { locationText } : {}),
        ...(description ? { description } : {}),
        ...(cap && !Number.isNaN(cap) ? { capacity: cap } : {}),
        ...(photos.length ? { photos } : {}),
        ...(asBusinessId ? { asBusinessId } : {}),
      });
      await qc.invalidateQueries({ queryKey: ['events', active.communityId] });
      onClose();
      setPhotos([]);
      setAsBusinessId(null);
      navigate(`/events/${ev.id}`);
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add an event" hero={{ icon: 'events', tone: 'warn' }}
      footer={<Button variant="primary" size="xl" fullWidth loading={busy} disabled={!title.trim() || !startsAt} onClick={submit}>Post event</Button>}>
      <StaggeredBody className="space-y-4">
        <ActingAsSelector value={asBusinessId} onChange={setAsBusinessId} />
        <PhotoInput value={photos} onChange={setPhotos} />
        <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer fete on the green" />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as EventCategory)} options={CATEGORIES} />
        <Field label="When" type="datetime-local" value={startsAt} min={minDateTime} onChange={(e) => setStartsAt(e.target.value)} />
        <Field label="Where" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="The Village Green" />
        <div className="space-y-1.5">
          <span className="text-small font-medium text-text">RSVPs</span>
          <SegmentedControl<RsvpMode>
            ariaLabel="RSVP mode"
            value={rsvpMode}
            onChange={setRsvpMode}
            options={[
              { value: 'none', label: 'None' },
              { value: 'open', label: 'Open' },
              { value: 'capacity', label: 'Limited' },
            ]}
          />
        </div>
        {rsvpMode === 'capacity' && (
          <Field label="Spaces" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="30" />
        )}
        <Textarea label="Details" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
      </StaggeredBody>
    </Sheet>
  );
}
