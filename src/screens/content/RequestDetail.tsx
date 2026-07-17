import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cardEnter, screenEnter } from '@/lib/motion';
import { cx } from '@/lib/cx';
import { deadlineLabel } from '@/lib/ics';
import { useServices } from '@/lib/services/provider';
import { useSession } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Banner, Button, Card, Chip, Icon, IconBadge, IconButton, Sheet, QueryError, Skeleton, Textarea, useToasts } from '@/components/ui';
import { ReportButton } from '@/components/moderation/ReportButton';
import { AuthorCard } from '@/components/content/AuthorCard';
import { REQUEST_CATEGORY_LABEL, REQUEST_STATUS_LABEL, labelFor } from '@/lib/labels';
import { shareLink } from '@/lib/share';

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

  // Peek's "I can help" deep-links here with ?reply=1 — open the reply sheet on arrival.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('reply') === '1' && r && !isAuthor) {
      setReplyOpen(true);
      setParams((p) => { p.delete('reply'); return p; }, { replace: true });
    }
  }, [params, r, isAuthor, setParams]);

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
        <p className="text-eyebrow uppercase text-textMuted">Request</p>
        {r && (
          <div className="ml-auto flex items-center gap-1">
            <IconButton icon="share" ariaLabel="Share" size="sm" onClick={() => shareLink(r.title, window.location.href, push)} />
            {!isAuthor && <ReportButton targetKind="request" targetId={r.id} targetLabel={r.title} />}
          </div>
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
                    <h1 className="text-h2 font-semibold text-text">{r.title}</h1>
                    {r.status !== 'open' && (
                      <Chip tone={r.status === 'fulfilled' ? 'positive' : 'neutral'} selected>
                        {labelFor(REQUEST_STATUS_LABEL, r.status)}
                      </Chip>
                    )}
                  </div>
                  <p className="text-small text-textMuted">{labelFor(REQUEST_CATEGORY_LABEL, r.category)}</p>
                  {(() => {
                    const dl = deadlineLabel(r.neededBy);
                    return dl ? (
                      <span className={cx('mt-1.5 inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-small font-medium', dl.urgent ? 'bg-warn/15 text-warn' : 'bg-surface text-textMuted')}>
                        <Icon name="calendar" size={13} /> {dl.text}
                      </span>
                    ) : null;
                  })()}
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
