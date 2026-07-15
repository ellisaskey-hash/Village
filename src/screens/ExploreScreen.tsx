import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cardEnter, screenEnter } from '@/lib/motion';
import { EmptyState, SegmentedControl } from '@/components/ui';
import { useActiveMembership } from '@/app/state/session';
import { DirectoryView } from '@/screens/directory/DirectoryView';
import { ListingsView } from '@/screens/content/ListingsView';
import { RequestsView } from '@/screens/content/RequestsView';
import { EventsView } from '@/screens/events/EventsView';

type Section = 'listings' | 'requests' | 'events' | 'directory';

const EMPTY: Record<Section, { icon: 'listings' | 'requests' | 'events' | 'places'; title: string; body: string }> = {
  listings: { icon: 'listings', title: 'Nothing for sale yet', body: 'Got something lying around? Give it a new home with a neighbour.' },
  requests: { icon: 'requests', title: 'Nobody needs a hand right now', body: 'Ask for one. Lifts, tools, recommendations, a spare pair of hands.' },
  events: { icon: 'events', title: "We're still setting up events", body: "The fete, markets and club nights land as we finish seeding your community." },
  directory: { icon: 'places', title: "We're still building the directory", body: 'Local shops, trades, groups and places are on their way.' },
};

export function ExploreScreen() {
  const [params] = useSearchParams();
  const initial = (params.get('tab') as Section | null) ?? 'listings';
  const [section, setSection] = useState<Section>(
    ['listings', 'requests', 'events', 'directory'].includes(initial) ? initial : 'listings',
  );
  const active = useActiveMembership();
  const e = EMPTY[section];

  return (
    <motion.div
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-4xl space-y-5 px-screenX py-6"
    >
      <motion.header variants={cardEnter}>
        <h1 className="font-display text-h1 font-bold text-text">Explore</h1>
        <p className="text-small text-textMuted">Everything happening in {active?.name ?? 'your community'}.</p>
      </motion.header>

      <motion.div variants={cardEnter} className="sticky top-0 z-10 -mx-screenX bg-[var(--c-glass-panel-bg)]/80 px-screenX py-2 backdrop-blur-md">
        <SegmentedControl<Section>
          ariaLabel="Explore section"
          value={section}
          onChange={setSection}
          options={[
            { value: 'listings', label: 'Listings' },
            { value: 'requests', label: 'Requests' },
            { value: 'events', label: 'Events' },
            { value: 'directory', label: 'Directory' },
          ]}
        />
      </motion.div>

      <motion.div variants={cardEnter}>
        {section === 'directory' ? (
          <DirectoryView />
        ) : section === 'listings' ? (
          <ListingsView />
        ) : section === 'requests' ? (
          <RequestsView />
        ) : section === 'events' ? (
          <EventsView />
        ) : (
          <EmptyState icon={e.icon} title={e.title} body={e.body} />
        )}
      </motion.div>
    </motion.div>
  );
}
