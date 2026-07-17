import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cx } from '@/lib/cx';
import { useServices } from '@/lib/services/provider';
import { useSession } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Avatar, Field, Icon, IconButton, Skeleton, useToasts, type IconName } from '@/components/ui';
import type { Message, ThreadContext, ThreadSummary } from '@/lib/services/types';

type ThreadData = { thread: ThreadSummary; messages: Message[] } | null;

/** "Today" / "Yesterday" / "Sat 19 Jul" divider label for grouping a thread by day. */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

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

  // Keep the newest message in view — but only yank to the bottom if the user is already near it,
  // so scrolling up to read history isn't interrupted by an incoming poll. Always snap on first load.
  const didInit = useRef(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !q.data) return;
    if (!didInit.current) {
      el.scrollTo({ top: el.scrollHeight });
      didInit.current = true;
      return;
    }
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [q.data]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || !session) return;
    // Optimistically show the message straight away (id prefixed so we can style it as pending and
    // roll it back on failure), rather than leaving the thread empty for the whole round-trip.
    const optimistic: Message = {
      id: `pending-${new Date().getTime()}`,
      threadId: id,
      senderId: session.profileId,
      senderName: session.profile.displayName,
      body,
      createdAt: new Date().toISOString(),
    };
    setDraft('');
    qc.setQueryData<ThreadData>(['thread', id], (old) =>
      old ? { ...old, messages: [...old.messages, optimistic] } : old,
    );
    setBusy(true);
    try {
      await services.threads.send(id, body);
      await qc.invalidateQueries({ queryKey: ['thread', id] });
      await qc.invalidateQueries({ queryKey: ['threads'] });
    } catch (err) {
      qc.setQueryData<ThreadData>(['thread', id], (old) =>
        old ? { ...old, messages: old.messages.filter((m) => m.id !== optimistic.id) } : old,
      );
      setDraft(body);
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
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/inbox'))} />
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
          <Icon name="chevron-right" size={14} className="text-textFaint" />
        </button>
      )}

      <div ref={scrollRef} className="sheet-scrollbar flex-1 space-y-1 overflow-y-auto py-2">
        {q.isLoading ? (
          <div className="space-y-2"><Skeleton height={40} /><Skeleton height={40} /></div>
        ) : !data ? (
          <p className="text-body text-textMuted">This conversation isn't available.</p>
        ) : (
          data.messages.length === 0 ? (
            <p className="py-6 text-center text-body text-textMuted">No messages yet. Say hello.</p>
          ) : (
            data.messages.map((m, i) => {
              const mine = m.senderId === session?.profileId;
              const prev = data.messages[i - 1];
              const showAvatar = !mine && (!prev || prev.senderId !== m.senderId);
              const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
              const pending = m.id.startsWith('pending-');
              return (
                <Fragment key={m.id}>
                  {showDay && (
                    <div className="flex justify-center py-2">
                      <span className="rounded-pill bg-bgElevated px-3 py-0.5 text-micro font-medium text-textMuted">{dayLabel(m.createdAt)}</span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: pending ? 0.6 : 1, y: 0 }}
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
                      <span className={cx('mt-0.5 flex items-center justify-end gap-1 text-micro', mine ? 'text-textOnAccent/70' : 'text-textFaint')}>
                        {pending && <Icon name="refresh" size={10} className="animate-spin" />}
                        {pending ? 'Sending' : clockTime(m.createdAt)}
                      </span>
                    </div>
                  </motion.div>
                </Fragment>
              );
            })
          )
        )}
      </div>

      <form onSubmit={send} className="safe-bottom flex items-end gap-2 border-t border-border py-3">
        <Field label="Message" hideLabel value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message" className="flex-1" />
        <IconButton icon="send" ariaLabel="Send" variant={draft.trim() ? 'primary' : 'surface'} size="md" onClick={() => void send()} disabled={busy || !draft.trim()} />
      </form>
    </div>
  );
}
