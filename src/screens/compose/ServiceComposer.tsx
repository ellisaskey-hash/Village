import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Field, Sheet, Textarea, useToasts } from '@/components/ui';

export function ServiceComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const services = useServices();
  const qc = useQueryClient();
  const push = useToasts();
  const active = useActiveMembership();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!active) return;
    setBusy(true);
    try {
      await services.directory.addService(active.communityId, {
        title,
        category: category || 'trades',
        ...(description ? { description } : {}),
      });
      await qc.invalidateQueries({ queryKey: ['directory'] });
      onClose();
      setTitle('');
      setCategory('');
      setDescription('');
      push({ title: 'Service added to the directory', variant: 'success' });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Offer a service" hero={{ icon: 'services', tone: 'accent' }}
      footer={<Button variant="primary" size="xl" fullWidth loading={busy} disabled={!title.trim()} onClick={submit}>Add service</Button>}>
      <div className="space-y-4">
        <Field label="What do you offer?" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Plumbing and heating" />
        <Field label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Trades" />
        <Textarea label="Details" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Gas Safe registered, local, 20 years' experience." maxLength={1000} />
      </div>
    </Sheet>
  );
}
