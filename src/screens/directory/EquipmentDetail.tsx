import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cardEnter, screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useSession } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Card, IconBadge, IconButton, Sheet, Skeleton, Textarea, useToasts } from '@/components/ui';
import { PhotoHero } from '@/components/content/PhotoHero';

export function EquipmentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const session = useSession();
  const push = useToasts();
  const [askOpen, setAskOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: ['equipment', id], queryFn: () => services.directory.equipmentItem(id), enabled: Boolean(id) });
  const e = q.data;
  const isOwner = Boolean(e && session && e.ownerProfileId === session.profileId);

  async function ask() {
    if (!e) return;
    setBusy(true);
    try {
      const threadId = await services.threads.open('direct', null, e.ownerProfileId, message || `Could I borrow the ${e.name}?`);
      setAskOpen(false);
      setMessage('');
      navigate(`/inbox/t/${threadId}`);
    } catch (err) {
      push({ title: errorMessage(err), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="mx-auto max-w-2xl space-y-5 px-screenX py-6">
      <header className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate(-1)} />
        <h1 className="font-display text-h1 font-bold text-text">Equipment</h1>
      </header>
      {q.isLoading ? (
        <div className="space-y-4"><Skeleton height={160} /><Skeleton height={72} /></div>
      ) : !e ? (
        <Card><p className="text-body text-textMuted">We couldn't find that item.</p></Card>
      ) : (
        <>
          <motion.div variants={cardEnter}>
            <PhotoHero icon="equipment" from="var(--c-positive)" to="var(--c-accent)" />
          </motion.div>
          <motion.div variants={cardEnter}>
            <Card>
              <div className="flex items-start gap-3">
                <IconBadge icon="equipment" tone="positive" size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-h2 font-semibold text-text">{e.name}</h2>
                  <p className="text-small text-textMuted capitalize">{e.category} · {e.ownerName}</p>
                </div>
              </div>
              {e.note && <p className="mt-3 text-body text-text">{e.note}</p>}
              {e.lendTerms && <p className="mt-2 text-small text-textMuted">Terms: {e.lendTerms}</p>}
            </Card>
          </motion.div>

          <motion.div variants={cardEnter}>
            {isOwner ? (
              <Card><p className="text-small text-textMuted">This is yours, in the lending library.</p></Card>
            ) : (
              <Button variant="primary" size="xl" fullWidth leadingIcon="requests" onClick={() => setAskOpen(true)}>Ask to borrow</Button>
            )}
          </motion.div>
        </>
      )}

      <Sheet open={askOpen} onClose={() => setAskOpen(false)} title="Ask to borrow" hero={{ icon: 'requests', tone: 'accent' }}
        footer={<Button variant="primary" size="xl" fullWidth loading={busy} onClick={ask}>Send</Button>}>
        <Textarea label="Your message" value={message} onChange={(ev) => setMessage(ev.target.value)} placeholder={e ? `Hi, could I borrow the ${e.name} this weekend?` : ''} maxLength={400} />
      </Sheet>
    </motion.div>
  );
}
