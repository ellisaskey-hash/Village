import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cx } from '@/lib/cx';
import { useServices } from '@/lib/services/provider';
import { useSession } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Field, IconButton, Skeleton, useToasts } from '@/components/ui';

export function ThreadScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const services = useServices();
  const session = useSession();
  const push = useToasts();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  // The mock has no realtime channel, so poll for liveness; the Supabase impl subscribes
  // to the messages channel (spec 09). Either way the query key is the seam.
  const q = useQuery({
    queryKey: ['thread', id],
    queryFn: () => services.threads.get(id),
    enabled: Boolean(id),
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (id) services.threads.markRead(id).then(() => qc.invalidateQueries({ queryKey: ['threads'] }));
  }, [id, services, qc, q.data?.messages.length]);

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

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px)] max-w-2xl flex-col px-screenX lg:h-dvh">
      <header className="flex items-center gap-2 py-4">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate('/inbox')} />
        <h1 className="truncate font-display text-h3 font-semibold text-text">
          {data?.thread.title ?? data?.thread.otherName ?? 'Conversation'}
        </h1>
      </header>

      <div className="sheet-scrollbar flex-1 space-y-2 overflow-y-auto py-2">
        {q.isLoading ? (
          <Skeleton height={40} />
        ) : !data ? (
          <p className="text-body text-textMuted">This conversation isn't available.</p>
        ) : (
          data.messages.map((m) => {
            const mine = m.senderId === session?.profileId;
            return (
              <div key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cx(
                    'max-w-[80%] rounded-lg px-3 py-2 text-body',
                    mine ? 'bg-brand text-textOnAccent' : 'border border-border bg-bgElevated text-text',
                  )}
                >
                  {!mine && <span className="block text-micro text-textMuted">{m.senderName}</span>}
                  {m.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="safe-bottom flex items-end gap-2 border-t border-border py-3">
        <Field label="Message" hideLabel value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message" className="flex-1" />
        <IconButton icon="send" ariaLabel="Send" variant="surface" size="md" onClick={() => void send()} disabled={busy} />
      </form>
    </div>
  );
}
