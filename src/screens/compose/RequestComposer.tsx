import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Field, Select, Sheet, Textarea, useToasts } from '@/components/ui';
import type { RequestCategory } from '@/lib/services/types';

const CATEGORIES: { value: RequestCategory; label: string }[] = [
  { value: 'help', label: 'A hand with something' },
  { value: 'trades', label: 'A trade or professional' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'lifts', label: 'A lift' },
  { value: 'recommendations', label: 'A recommendation' },
  { value: 'borrow', label: 'To borrow something' },
  { value: 'pets', label: 'Pets' },
  { value: 'other', label: 'Something else' },
];

export function RequestComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const services = useServices();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const push = useToasts();
  const active = useActiveMembership();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RequestCategory>('help');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!active) return;
    setBusy(true);
    try {
      const r = await services.requests.create(active.communityId, {
        title,
        category,
        ...(description ? { description } : {}),
      });
      await qc.invalidateQueries({ queryKey: ['requests', active.communityId] });
      onClose();
      setTitle('');
      setDescription('');
      navigate(`/requests/${r.id}`);
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ask for a hand"
      hero={{ icon: 'requests', tone: 'accent' }}
      footer={
        <Button variant="primary" size="xl" fullWidth loading={busy} onClick={submit}>
          Post request
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="What do you need?" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Borrow a ladder for the weekend" />
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as RequestCategory)}
          options={CATEGORIES}
        />
        <Textarea label="Any detail?" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A step ladder would be perfect. Happy to collect." maxLength={500} />
      </div>
    </Sheet>
  );
}
