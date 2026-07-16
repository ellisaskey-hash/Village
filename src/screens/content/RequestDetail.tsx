import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cardEnter, screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useSession } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Badge, Banner, Button, Card, IconBadge, IconButton, Sheet, QueryError, Skeleton, Textarea, useToasts } from '@/components/ui';
import { ReportButton } from '@/components/moderation/ReportButton';
import { AuthorCard } from '@/components/content/AuthorCard';

export function RequestDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const session = useSession();
  const push = useToasts();
  const qc = useQueryClient();
  const [replyOpen, setReplyOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: ['request', id], queryFn: () => services.requests.get(id), enabled: Boolean(id) });
  const r = q.data;
  const isAuthor = Boolean(r && session && r.createdBy === session.profileId);

  async function help() {
    setBusy(true);
    try {
      const threadId = await services.threads.open('request', id, null, message);
      setReplyOpen(false);
      setMessage('');
      await qc.invalidateQueries({ queryKey: ['request', id] });
      navigate(`/inbox/t/${threadId}`);
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: 'fulfilled' | 'withdrawn') {
    try {
      await services.requests.setStatus(id, status);
      await qc.invalidateQueries({ queryKey: ['request', id] });
      await qc.invalidateQueries({ queryKey: ['requests'] });
      push({ title: status === 'fulfilled' ? 'Marked as sorted' : 'Request withdrawn', variant: 'success' });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    }
  }

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="mx-auto max-w-2xl space-y-5 px-screenX py-6">
      <motion.header variants={cardEnter} className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate(-1)} />
        <h1 className="font-display text-h1 font-bold text-text">Request</h1>
        {r && !isAuthor && (
          <span className="ml-auto">
            <ReportButton targetKind="request" targetId={r.id} targetLabel={r.title} />
          </span>
        )}
      </motion.header>

      {q.isLoading ? (
        <div className="space-y-4"><Skeleton height={120} /><Skeleton height={72} /></div>
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : !r ? (
        <Card><p className="text-body text-textMuted">We couldn't find that request.</p></Card>
      ) : (
        <>
          {isAuthor && r.hidden && (
            <motion.div variants={cardEnter}>
              <Banner tone="warn" icon="eye" title="This is hidden while we review a report" body="Only you and the moderators can see it for now. We'll be in touch if anything is needed." />
            </motion.div>
          )}
          <motion.div variants={cardEnter}>
            <Card>
              <div className="flex items-start gap-3">
                <IconBadge icon="requests" tone="accent" size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-h2 font-semibold text-text">{r.title}</h2>
                    {r.status !== 'open' && <Badge tone="warn" dot />}
                  </div>
                  <p className="text-small text-textMuted capitalize">{r.category}</p>
                </div>
              </div>
              {r.description && <p className="mt-3 text-body text-text">{r.description}</p>}
            </Card>
          </motion.div>

          {!isAuthor && (
            <motion.div variants={cardEnter}>
              <AuthorCard communityId={r.communityId} profileId={r.createdBy} fallbackName={r.authorName} />
            </motion.div>
          )}

          <motion.div variants={cardEnter}>
          {isAuthor ? (
            <div className="flex gap-2">
              <Button variant="primary" size="xl" fullWidth leadingIcon="check" onClick={() => setStatus('fulfilled')} disabled={r.status === 'fulfilled'}>
                {r.status === 'fulfilled' ? 'Sorted' : 'Mark as sorted'}
              </Button>
              <Button variant="secondary" size="xl" onClick={() => setStatus('withdrawn')}>
                Withdraw
              </Button>
            </div>
          ) : r.status === 'open' || r.status === 'answered' ? (
            <Button variant="primary" size="xl" fullWidth leadingIcon="requests" onClick={() => setReplyOpen(true)}>
              I can help
            </Button>
          ) : (
            <Card><p className="text-small text-textMuted">This request is closed.</p></Card>
          )}
          </motion.div>
        </>
      )}

      <Sheet open={replyOpen} onClose={() => setReplyOpen(false)} title="Offer to help" hero={{ icon: 'requests', tone: 'accent' }}
        footer={<Button variant="primary" size="xl" fullWidth loading={busy} disabled={!message.trim()} onClick={help}>Send</Button>}>
        <Textarea label="Your message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Happy to help. I've got a ladder you can borrow this weekend." maxLength={500} />
      </Sheet>
    </motion.div>
  );
}
