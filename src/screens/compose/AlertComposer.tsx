import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, InfoCallout, SegmentedControl, Sheet, Textarea, Field, useToasts } from '@/components/ui';
import { PhotoInput } from '@/components/content/PhotoInput';
import type { AlertCategory } from '@/lib/services/types';

const CATEGORIES: { value: AlertCategory; label: string }[] = [
  { value: 'lostPet', label: 'Lost pet' },
  { value: 'foundItem', label: 'Found' },
  { value: 'lostItem', label: 'Lost' },
  { value: 'notice', label: 'Notice' },
];

export function AlertComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const services = useServices();
  const qc = useQueryClient();
  const push = useToasts();
  const active = useActiveMembership();
  const [category, setCategory] = useState<AlertCategory>('lostPet');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!active) return;
    setBusy(true);
    try {
      await services.alerts.post(active.communityId, {
        tier: 'community',
        category,
        title,
        ...(body ? { body } : {}),
        ...(photos.length ? { photos } : {}),
      });
      await qc.invalidateQueries({ queryKey: ['alerts', active.communityId] });
      onClose();
      setTitle('');
      setBody('');
      setPhotos([]);
      push({ title: 'Alert posted to your community', variant: 'success' });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Post an alert" hero={{ icon: 'alerts', tone: 'danger' }}
      footer={<Button variant="primary" size="xl" fullWidth loading={busy} onClick={submit}>Post alert</Button>}>
      <div className="space-y-4">
        <InfoCallout icon="shield">
          Community alerts reach neighbours who've opted in. Road closures and safety notices are
          posted by verified organisations like the parish council.
        </InfoCallout>
        <div className="space-y-1.5">
          <span className="text-small font-medium text-text">Type</span>
          <SegmentedControl<AlertCategory> ariaLabel="Alert type" value={category} onChange={setCategory} options={CATEGORIES} />
        </div>
        <Field label="Headline" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lost cat near the green" />
        <Textarea label="Details" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ginger tom, answers to Milo. Last seen on Maidstone Road." maxLength={600} />
        <PhotoInput value={photos} onChange={setPhotos} label="Photo (helps neighbours spot it)" />
      </div>
    </Sheet>
  );
}
