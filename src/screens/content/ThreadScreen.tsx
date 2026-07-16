import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { useServices } from '@/lib/services/provider';
import { useSession } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Avatar, Field, Icon, IconButton, Skeleton, useToasts, type IconName } from '@/components/ui';
import type { ThreadContext } from '@/lib/services/types';

const CONTEXT: Record<Exclude<ThreadContext, 'direct'>, { icon: IconName; path: string; label: string }> = {
  listing: { icon: 'listings', path: '/listings', label: 'the listing' },
  request: { icon: 'requests', path: '/requests', label: 'the request' },
  event: { icon: 'events', path: '/events', label: 'the event' },
  business: { icon: 'businesses', path: '/businesses', label: 'the business' },
  organisation: { icon: 'organisations', path: '/organisations', label: 'the organisation' },
};

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function ThreadScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const session = useSession();
  const push = useToasts();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ['thread', id],
    queryFn: () => services.threads.get(id),
    enabled: Boolean(id),
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (id) services.threads.markRead(id).then(() => qc.invalidateQueries({ queryKey: ['threads'] }));
  }, [id, services, qc, q.data?.messages.length]);

  // Keep the newest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [q.data?.messages.length]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await services.threads.send(id, draft);
      setDraft('');
      await qc.invalidateQueries({ queryKey: ['thread', id] });
    } catch (err) {
      push({ title: errorMessage(err), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const data = q.data;
  const ctx = data && data.thread.context !== 'direct' ? CONTEXT[data.thread.context] : null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px)] max-w-2xl flex-col px-screenX lg:h-dvh">
      <header className="flex items-center gap-2 py-4">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate('/inbox')} />
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={data?.thread.otherName ?? 'Neighbour'} size="sm" />
          <h1 className="truncate font-display text-h3 font-semibold text-text">
            {data?.thread.title ?? data?.thread.otherName ?? 'Conversation'}
          </h1>
        </div>
      </header>

      {ctx && data?.thread.contextId && (
        <button
          type="button"
          onClick={() => navigate(`${ctx.path}/${data.thread.contextId}`)}
          className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-bgElevated px-3 py-2 text-left transition-colors hover:border-borderStrong"
        >
          <Icon name={ctx.icon} size={16} className="text-accent" />
          <span className="flex-1 truncate text-small text-textMuted">About {ctx.label}</span>
          <Icon name="more" size={14} className="text-textFaint" />
        </button>
      )}

      <div ref={scrollRef} className="sheet-scrollbar flex-1 space-y-1 overflow-y-auto py-2">
        {q.isLoading ? (
          <div className="space-y-2"><Skeleton height={40} /><Skeleton height={40} /></div>
        ) : !data ? (
          <p className="text-body text-textMuted">This conversation isn't available.</p>
        ) : (
          data.messages.map((m, i) => {
            const mine = m.senderId === session?.profileId;
            const prev = data.messages[i - 1];
            const showAvatar = !mine && (!prev || prev.senderId !== m.senderId);
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cx('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}
              >
                {!mine && (showAvatar ? <Avatar name={m.senderName} size="sm" /> : <span className="w-8 shrink-0" />)}
                <div
                  className={cx(
                    'max-w-[78%] rounded-2xl px-3.5 py-2 text-body shadow-card',
                    mine ? 'rounded-br-md bg-brand text-textOnAccent' : 'rounded-bl-md border border-border bg-bgElevated text-text',
                  )}
                >
                  {showAvatar && <span className="mb-0.5 block text-micro font-medium text-textMuted">{m.senderName}</span>}
                  <span className="whitespace-pre-wrap">{m.body}</span>
                  <span className={cx('mt-0.5 block text-right text-micro', mine ? 'text-textOnAccent/70' : 'text-textFaint')}>{clockTime(m.createdAt)}</span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="safe-bottom flex items-end gap-2 border-t border-border py-3">
        <Field label="Message" hideLabel value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message" className="flex-1" />
        <IconButton icon="send" ariaLabel="Send" variant="surface" size="md" onClick={() => void send()} disabled={busy || !draft.trim()} />
      </form>
    </div>
  );
}
