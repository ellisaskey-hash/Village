import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership, useSession, useSessionStore } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Avatar, Button, Chip, Field, Sheet, Textarea, useToasts } from '@/components/ui';
import { PhotoInput } from '@/components/content/PhotoInput';
import type { Identity } from '@/lib/services/types';

const IDENTITIES: { value: Identity; label: string }[] = [
  { value: 'resident', label: 'Resident' },
  { value: 'parent', label: 'Parent' },
  { value: 'tradesperson', label: 'Tradesperson' },
  { value: 'business', label: 'Business owner' },
  { value: 'club', label: 'Club or group' },
];

/** Edit your profile — name, avatar, bio and identity chips (spec 07 Me). Wires the existing
 *  profiles.update + memberships.updateIdentities services that had no UI. */
export function EditProfileSheet({ open, onClose, currentIdentities }: { open: boolean; onClose: () => void; currentIdentities: Identity[] }) {
  const services = useServices();
  const session = useSession();
  const active = useActiveMembership();
  const setSession = useSessionStore((s) => s.setSession);
  const push = useToasts();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [busy, setBusy] = useState(false);

  // Seed from the session each time the sheet opens.
  useEffect(() => {
    if (open && session) {
      setName(session.profile.displayName);
      setBio(session.profile.bio ?? '');
      setAvatar(session.profile.avatarUrl ? [session.profile.avatarUrl] : []);
      setIdentities(currentIdentities);
    }
  }, [open, session, currentIdentities]);

  function toggle(id: Identity) {
    setIdentities((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function save() {
    if (!session) return;
    setBusy(true);
    try {
      const updated = await services.profiles.update({
        displayName: name.trim(),
        bio: bio.trim() || null,
        avatarUrl: avatar[0] ?? null,
      });
      setSession({ ...session, profile: updated });
      if (active) await services.memberships.updateIdentities(active.communityId, identities);
      await qc.invalidateQueries({ queryKey: ['members', active?.communityId] });
      push({ title: 'Profile updated', variant: 'success' });
      onClose();
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
      title="Edit profile"
      hero={{ icon: 'user', tone: 'accent' }}
      footer={<Button variant="primary" size="xl" fullWidth loading={busy} onClick={save}>Save</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={name || 'You'} {...(avatar[0] ? { src: avatar[0] } : {})} size="xl" />
          <PhotoInput value={avatar} onChange={setAvatar} max={1} label="Photo" />
        </div>
        <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sam Fletcher" />
        <Textarea label="About you (optional)" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A line or two your neighbours will see." maxLength={300} />
        <div className="space-y-1.5">
          <span className="text-small font-medium text-text">How would you describe yourself here?</span>
          <div className="flex flex-wrap gap-2">
            {IDENTITIES.map((id) => (
              <Chip key={id.value} selected={identities.includes(id.value)} onClick={() => toggle(id.value)}>{id.label}</Chip>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
