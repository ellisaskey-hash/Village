import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Field, Select, Sheet, Textarea, useToasts } from '@/components/ui';
import { PhotoInput } from '@/components/content/PhotoInput';

const CATEGORIES = [
  { value: 'garden', label: 'Garden' },
  { value: 'diy', label: 'DIY' },
  { value: 'transport', label: 'Transport' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'events', label: 'Events' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
];

export function EquipmentComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const services = useServices();
  const qc = useQueryClient();
  const push = useToasts();
  const active = useActiveMembership();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('garden');
  const [note, setNote] = useState('');
  const [lendTerms, setLendTerms] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!active) return;
    setBusy(true);
    try {
      await services.directory.addEquipment(active.communityId, {
        name,
        category: category as 'garden' | 'diy' | 'transport' | 'kitchen' | 'events' | 'sports' | 'other',
        ...(note ? { note } : {}),
        ...(lendTerms ? { lendTerms } : {}),
        ...(photos.length ? { photos } : {}),
      });
      await qc.invalidateQueries({ queryKey: ['directory'] });
      onClose();
      setName('');
      setNote('');
      setLendTerms('');
      setPhotos([]);
      push({ title: 'Added to the lending library', variant: 'success' });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Offer equipment to lend" hero={{ icon: 'equipment', tone: 'accent' }}
      footer={<Button variant="primary" size="xl" fullWidth loading={busy} disabled={!name.trim()} onClick={submit}>Add to library</Button>}>
      <div className="space-y-4">
        <PhotoInput value={photos} onChange={setPhotos} />
        <Field label="What is it?" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pressure washer" />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES} />
        <Textarea label="Anything to note?" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Petrol, quite heavy." maxLength={500} />
        <Field label="Lending terms" value={lendTerms} onChange={(e) => setLendTerms(e.target.value)} placeholder="Collect from me, back within 3 days" />
      </div>
    </Sheet>
  );
}
