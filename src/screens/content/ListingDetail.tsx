import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cardEnter, screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useSession } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Banner, Button, Card, IconBadge, IconButton, Sheet, QueryError, Skeleton, Textarea, useToasts } from '@/components/ui';
import { ReportButton } from '@/components/moderation/ReportButton';
import { PhotoHero } from '@/components/content/PhotoHero';
import { AuthorCard } from '@/components/content/AuthorCard';
import { priceLabel } from './ListingsView';
import type { ListingStatus } from '@/lib/services/types';

const CONDITION: Record<string, string> = { new: 'New', likeNew: 'Like new', good: 'Good', fair: 'Fair', spares: 'Spares or repair' };

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
      <motion.header variants={cardEnter} className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate(-1)} />
        <h1 className="font-display text-h1 font-bold text-text">Listing</h1>
        {l && !isAuthor && (
          <span className="ml-auto">
            <ReportButton targetKind="listing" targetId={l.id} targetLabel={l.title} />
          </span>
        )}
      </motion.header>

      {q.isLoading ? (
        <div className="space-y-4"><Skeleton height={208} /><Skeleton height={120} /></div>
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : !l ? (
        <Card><p className="text-body text-textMuted">We couldn't find that listing.</p></Card>
      ) : (
        <>
          {isAuthor && l.hidden && (
            <motion.div variants={cardEnter}>
              <Banner tone="warn" icon="eye" title="This is hidden while we review a report" body="Only you and the moderators can see it for now. We'll be in touch if anything is needed." />
            </motion.div>
          )}
          <motion.div variants={cardEnter}>
            <PhotoHero photos={l.photos} icon="listings" from={l.kind === 'free' ? 'var(--c-positive)' : 'var(--c-accent)'} to="var(--c-accent-warm)" />
          </motion.div>
          <motion.div variants={cardEnter}>
            <Card>
              <div className="flex items-start gap-3">
                <IconBadge icon="listings" tone={l.kind === 'free' ? 'positive' : 'accent'} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-h2 font-semibold text-text">{l.title}</h2>
                  <p className="text-small text-textMuted">{priceLabel(l)}{l.condition ? ` · ${CONDITION[l.condition] ?? l.condition}` : ''}{l.category ? ` · ${l.category}` : ''}</p>
                </div>
              </div>
              {l.description && <p className="mt-3 text-body text-text">{l.description}</p>}
              {l.status !== 'active' && <p className="mt-2 text-small text-warn capitalize">{l.status}</p>}
            </Card>
          </motion.div>

          {!isAuthor && (
            <motion.div variants={cardEnter}>
              <AuthorCard communityId={l.communityId} profileId={l.createdBy} fallbackName={l.authorName} />
            </motion.div>
          )}

          <motion.div variants={cardEnter}>
            {isAuthor ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setStatus(l.status === 'reserved' ? 'active' : 'reserved')} disabled={l.status === 'completed'}>
                  {l.status === 'reserved' ? 'Un-reserve' : 'Mark reserved'}
                </Button>
                <Button variant="primary" size="sm" leadingIcon="check" onClick={() => setStatus('completed')} disabled={l.status === 'completed'}>Mark done</Button>
                <Button variant="ghost" size="sm" onClick={() => setStatus('withdrawn')}>Withdraw</Button>
              </div>
            ) : l.status === 'active' || l.status === 'reserved' ? (
              <Button variant="primary" size="xl" fullWidth leadingIcon="messages" onClick={() => setReplyOpen(true)}>Message about this</Button>
            ) : (
              <Card><p className="text-small text-textMuted">This listing is closed.</p></Card>
            )}
          </motion.div>
        </>
      )}

      <Sheet open={replyOpen} onClose={() => setReplyOpen(false)} title="Message about this" hero={{ icon: 'messages', tone: 'accent' }}
        footer={<Button variant="primary" size="xl" fullWidth loading={busy} disabled={!message.trim()} onClick={messageAbout}>Send</Button>}>
        <Textarea label="Your message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi, is this still available? I could collect on Saturday." maxLength={500} />
      </Sheet>
    </motion.div>
  );
}
