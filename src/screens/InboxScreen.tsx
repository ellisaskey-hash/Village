import { useState } from 'react';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { EmptyState, SegmentedControl } from '@/components/ui';

type Section = 'messages' | 'notifications';

export function InboxScreen() {
  const [section, setSection] = useState<Section>('messages');

  return (
    <motion.div
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-2xl space-y-6 px-screenX py-6"
    >
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
        <EmptyState
          icon="messages"
          title="No messages yet"
          body="When you respond to a listing or request, the conversation shows up here."
        />
      ) : (
        <EmptyState
          icon="bell"
          title="Nothing to catch up on"
          body="Replies, alerts you opt into, and event reminders will appear here."
        />
      )}
    </motion.div>
  );
}
