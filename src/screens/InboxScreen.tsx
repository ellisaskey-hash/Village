import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { cardEnter, listContainer, listItem, screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { Avatar, Badge, EmptyState, Icon, IconBadge, QueryError, SegmentedControl, Skeleton, type IconName } from '@/components/ui';
import { cx } from '@/lib/cx';
import type { ThreadContext } from '@/lib/services/types';

type Section = 'messages' | 'notifications';

const CONTEXT_ICON: Record<ThreadContext, IconName> = {
  listing: 'listings', request: 'requests', business: 'businesses',
  organisation: 'organisations', event: 'events', direct: 'messages',
};
const NOTE_ICON: Record<string, IconName> = {
  message: 'messages', 'request.response': 'requests', 'listing.enquiry': 'listings',
  'event.reminder': 'events', 'event.change': 'events', 'claim.decided': 'businesses',
};

function ago(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function InboxScreen() {
  const [section, setSection] = useState<Section>('messages');
  const services = useServices();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const threads = useQuery({ queryKey: ['threads'], queryFn: () => services.threads.mine() });
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => services.notifications.mine() });

  useEffect(() => {
    if (section === 'notifications') {
      services.notifications.markAllRead().then(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
    }
  }, [section, services, qc]);

  const unreadThreads = (threads.data ?? []).filter((t) => t.unread).length;

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="mx-auto max-w-2xl space-y-5 px-screenX py-6">
      <motion.header variants={cardEnter}>
        <h1 className="font-display text-h1 font-bold text-text">Inbox</h1>
      </motion.header>

      <motion.div variants={cardEnter}>
        <SegmentedControl<Section>
          ariaLabel="Inbox section"
          value={section}
          onChange={setSection}
          options={[
            { value: 'messages', label: unreadThreads > 0 ? `Messages (${unreadThreads})` : 'Messages' },
            { value: 'notifications', label: 'Notifications' },
          ]}
        />
      </motion.div>

      <motion.div variants={cardEnter}>
        {section === 'messages' ? (
          threads.isError ? (
            <QueryError onRetry={() => threads.refetch()} />
          ) : threads.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={64} />)}</div>
          ) : !threads.data || threads.data.length === 0 ? (
            <EmptyState icon="messages" title="No messages yet" body="When you respond to a listing or request, the conversation shows up here." />
          ) : (
            <motion.div variants={listContainer} initial="initial" animate="animate" className="space-y-2">
              {threads.data.map((t) => (
                <motion.button
                  key={t.id}
                  variants={listItem}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/inbox/t/${t.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-bgElevated p-3 text-left transition-colors hover:border-borderStrong"
                >
                  <div className="relative">
                    <Avatar name={t.otherName} size="md" />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-bgElevated bg-surface">
                      <Icon name={CONTEXT_ICON[t.context]} size={11} className="text-textMuted" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cx('truncate text-body', t.unread ? 'font-semibold text-text' : 'font-medium text-text')}>{t.title ?? t.otherName}</p>
                    <p className="truncate text-small text-textMuted">{t.otherName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-small text-textFaint">{ago(t.lastMessageAt)}</span>
                    {t.unread && <Badge dot tone="accent" />}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )
        ) : notifications.isError ? (
          <QueryError onRetry={() => notifications.refetch()} />
        ) : notifications.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={64} />)}</div>
        ) : !notifications.data || notifications.data.length === 0 ? (
          <EmptyState icon="bell" title="Nothing to catch up on" body="Replies, alerts you opt into, and event reminders will appear here." />
        ) : (
          <motion.div variants={listContainer} initial="initial" animate="animate" className="space-y-2">
            {notifications.data.map((n) => (
              <motion.button
                key={n.id}
                variants={listItem}
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={!n.deepLink}
                onClick={() => n.deepLink && navigate(n.deepLink)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-bgElevated p-3 text-left transition-colors enabled:hover:border-borderStrong disabled:cursor-default"
              >
                <IconBadge icon={NOTE_ICON[n.category] ?? 'bell'} tone={n.readAt ? 'neutral' : 'accent'} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-text">{n.title}</p>
                  {n.body && <p className="truncate text-small text-textMuted">{n.body}</p>}
                </div>
                <span className="text-small text-textFaint">{ago(n.createdAt)}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
