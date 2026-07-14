import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { Badge, EmptyState, Icon, IconBadge, ListRow, SegmentedControl, Skeleton } from '@/components/ui';
import type { ThreadContext } from '@/lib/services/types';

type Section = 'messages' | 'notifications';

const CONTEXT_ICON: Record<ThreadContext, 'listings' | 'requests' | 'businesses' | 'organisations' | 'events' | 'messages'> = {
  listing: 'listings',
  request: 'requests',
  business: 'businesses',
  organisation: 'organisations',
  event: 'events',
  direct: 'messages',
};

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

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="mx-auto max-w-2xl space-y-6 px-screenX py-6">
      <header>
        <h1 className="font-display text-h1 font-bold text-text">Inbox</h1>
      </header>

      <SegmentedControl<Section>
        ariaLabel="Inbox section"
        value={section}
        onChange={setSection}
        options={[
          { value: 'messages', label: 'Messages' },
          { value: 'notifications', label: 'Notifications' },
        ]}
      />

      {section === 'messages' ? (
        threads.isLoading ? (
          <Skeleton height={72} />
        ) : !threads.data || threads.data.length === 0 ? (
          <EmptyState icon="messages" title="No messages yet" body="When you respond to a listing or request, the conversation shows up here." />
        ) : (
          <div className="space-y-2">
            {threads.data.map((t) => (
              <ListRow
                key={t.id}
                leading={<IconBadge icon={CONTEXT_ICON[t.context]} tone="accent" />}
                title={t.title ?? t.otherName}
                subtitle={t.otherName}
                trailing={t.unread ? <Badge dot tone="accent" /> : undefined}
                onClick={() => navigate(`/inbox/t/${t.id}`)}
              />
            ))}
          </div>
        )
      ) : notifications.isLoading ? (
        <Skeleton height={72} />
      ) : !notifications.data || notifications.data.length === 0 ? (
        <EmptyState icon="bell" title="Nothing to catch up on" body="Replies, alerts you opt into, and event reminders will appear here." />
      ) : (
        <div className="space-y-2">
          {notifications.data.map((n) => (
            <ListRow
              key={n.id}
              leading={<Icon name="bell" size={20} className="text-textMuted" />}
              title={n.title}
              subtitle={n.body ?? ''}
              {...(n.deepLink ? { onClick: () => navigate(n.deepLink as string) } : {})}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
