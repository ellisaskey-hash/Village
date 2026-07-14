import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useSession } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Card, IconBadge, IconButton, Sheet, Skeleton, Textarea, useToasts } from '@/components/ui';
import { priceLabel } from './ListingsView';
import type { ListingStatus } from '@/lib/services/types';

export function ListingDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const session = useSession();
  const push = useToasts();
  const qc = useQueryClient();
  const [replyOpen, setReplyOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: ['listing', id], queryFn: () => services.listings.get(id), enabled: Boolean(id) });
  const l = q.data;
  const isAuthor = Boolean(l && session && l.createdBy === session.profileId);

  async function messageAbout() {
    setBusy(true);
    try {
      const threadId = await services.threads.open('listing', id, null, message);
      setReplyOpen(false);
      setMessage('');
      navigate(`/inbox/t/${threadId}`);
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: ListingStatus) {
    try {
      await services.listings.setStatus(id, status);
      await qc.invalidateQueries({ queryKey: ['listing', id] });
      await qc.invalidateQueries({ queryKey: ['listings'] });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    }
  }

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="mx-auto max-w-2xl space-y-5 px-screenX py-6">
      <header className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate(-1)} />
        <h1 className="font-display text-h1 font-bold text-text">Listing</h1>
      </header>

      {q.isLoading ? (
        <Skeleton height={140} />
      ) : !l ? (
        <Card><p className="text-body text-textMuted">We couldn't find that listing.</p></Card>
      ) : (
        <>
          <Card>
            <div className="flex items-start gap-3">
              <IconBadge icon="listings" tone={l.kind === 'free' ? 'positive' : 'accent'} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="text-h2 font-semibold text-text">{l.title}</h2>
                <p className="text-small text-textMuted">{priceLabel(l)} · {l.authorName}</p>
              </div>
            </div>
            {l.description && <p className="mt-3 text-body text-text">{l.description}</p>}
            {l.status !== 'active' && <p className="mt-2 text-small text-warn">Status: {l.status}</p>}
          </Card>

          {isAuthor ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setStatus(l.status === 'reserved' ? 'active' : 'reserved')} disabled={l.status === 'completed'}>
                {l.status === 'reserved' ? 'Un-reserve' : 'Mark reserved'}
              </Button>
              <Button variant="primary" size="sm" leadingIcon="check" onClick={() => setStatus('completed')} disabled={l.status === 'completed'}>
                Mark done
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStatus('withdrawn')}>
                Withdraw
              </Button>
            </div>
          ) : l.status === 'active' || l.status === 'reserved' ? (
            <Button variant="primary" size="xl" fullWidth leadingIcon="messages" onClick={() => setReplyOpen(true)}>
              Message about this
            </Button>
          ) : (
            <Card><p className="text-small text-textMuted">This listing is closed.</p></Card>
          )}
        </>
      )}

      <Sheet open={replyOpen} onClose={() => setReplyOpen(false)} title="Message about this" hero={{ icon: 'messages', tone: 'accent' }}
        footer={<Button variant="primary" size="xl" fullWidth loading={busy} onClick={messageAbout}>Send</Button>}>
        <Textarea label="Your message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi, is this still available? I could collect on Saturday." maxLength={500} />
      </Sheet>
    </motion.div>
  );
}
