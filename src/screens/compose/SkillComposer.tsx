import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Field, Sheet, Textarea, useToasts } from '@/components/ui';

/** Share a skill for the neighbour skills directory (spec 07). Wires directory.addSkill,
 *  which had no UI. */
export function SkillComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const services = useServices();
  const qc = useQueryClient();
  const push = useToasts();
  const active = useActiveMembership();
  const [skill, setSkill] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!active || !skill.trim()) return;
    setBusy(true);
    try {
      await services.directory.addSkill(active.communityId, skill.trim(), note.trim() || undefined);
      await qc.invalidateQueries({ queryKey: ['directory'] });
      onClose();
      setSkill('');
      setNote('');
      push({ title: 'Skill shared with your neighbours', variant: 'success' });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Share a skill" hero={{ icon: 'sparkle', tone: 'purple' }}
      footer={<Button variant="primary" size="xl" fullWidth loading={busy} disabled={!skill.trim()} onClick={submit}>Share skill</Button>}>
      <div className="space-y-4">
        <Field label="What can you help with?" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Bike repairs, French, first aid" />
        <Textarea label="Anything to add? (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Happy to show anyone the basics." maxLength={300} />
      </div>
    </Sheet>
  );
}
