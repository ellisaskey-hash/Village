import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import {
  Badge,
  Button,
  Card,
  Icon,
  IconBadge,
  IconButton,
  ListRow,
  useToasts,
  type IconName,
} from '@/components/ui';
import type { ProposalKind } from '@/lib/services/types';

const KIND_ICON: Record<ProposalKind, IconName> = {
  place: 'places',
  business: 'businesses',
  organisation: 'organisations',
  event: 'events',
};

export function SeedingConsole() {
  const services = useServices();
  const navigate = useNavigate();
  const push = useToasts();
  const qc = useQueryClient();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';

  const proposals = useQuery({
    queryKey: ['proposals', communityId],
    queryFn: () => services.seeding.proposals(communityId),
    enabled: Boolean(communityId),
  });
  const places = useQuery({ queryKey: ['directory', 'places', communityId], queryFn: () => services.directory.places(communityId), enabled: Boolean(communityId) });
  const businesses = useQuery({ queryKey: ['directory', 'businesses', communityId], queryFn: () => services.directory.businesses(communityId), enabled: Boolean(communityId) });
  const organisations = useQuery({ queryKey: ['directory', 'organisations', communityId], queryFn: () => services.directory.organisations(communityId), enabled: Boolean(communityId) });

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['proposals', communityId] }),
      qc.invalidateQueries({ queryKey: ['directory'] }),
    ]);
  }

  async function runIngestion() {
    try {
      const n = await services.seeding.runFixtureIngestion(communityId);
      await refresh();
      push({ title: `Ingested ${n} proposals`, variant: 'success' });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    }
  }

  async function decide(id: string, accept: boolean) {
    try {
      await services.seeding.decide(id, accept);
      await refresh();
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    }
  }

  async function launch() {
    try {
      await services.seeding.launch(communityId);
      await refresh();
      push({ title: `${active?.name} is live`, variant: 'success' });
    } catch (e) {
      push({ title: errorMessage(e), variant: 'error' });
    }
  }

  const pending = (proposals.data ?? []).filter((p) => p.status === 'pending');
  const placeCount = places.data?.length ?? 0;
  const bizCount = businesses.data?.length ?? 0;
  const verifiedOrgs = (organisations.data ?? []).filter((o) => o.verifiedSource).length;

  const checklist = [
    { label: '15+ places accepted', met: placeCount >= 15, value: placeCount },
    { label: '10+ business stubs', met: bizCount >= 10, value: bizCount },
    { label: '2+ verified organisations', met: verifiedOrgs >= 2, value: verifiedOrgs },
  ];

  return (
    <motion.main
      id="main"
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-2xl space-y-sectionGap px-screenX py-6"
    >
      <header className="flex items-center gap-2">
        <IconButton icon="back" ariaLabel="Back" size="sm" onClick={() => navigate('/')} />
        <div>
          <h1 className="font-display text-h1 font-bold text-text">Seeding console</h1>
          <p className="text-small text-textMuted">{active?.name}</p>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 font-semibold text-text">Ingest</h2>
          <Button variant="primary" size="sm" leadingIcon="refresh" onClick={runIngestion}>
            Run fixture ingestion
          </Button>
        </div>
        <Card>
          <p className="text-small text-textMuted">
            Fixture ingestion loads a Horsmonden-shaped sample (Overpass, FHRS, Companies House,
            org extracts) into the review queue. Live sources connect once API keys are added.
          </p>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-h3 font-semibold text-text">Launch checklist</h2>
        <Card className="space-y-2">
          {checklist.map((c) => (
            <div key={c.label} className="flex items-center gap-2">
              <Icon name={c.met ? 'check' : 'close'} size={16} className={c.met ? 'text-positive' : 'text-textFaint'} />
              <span className="flex-1 text-body text-text">{c.label}</span>
              <span className="tabular text-small text-textMuted">{c.value}</span>
            </div>
          ))}
          <Button variant="secondary" size="sm" className="mt-2" onClick={launch}>
            Launch {active?.name}
          </Button>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-h3 font-semibold text-text">Review queue</h2>
          <Badge count={pending.length} tone="warn" />
        </div>
        {pending.length === 0 ? (
          <Card>
            <p className="text-body text-textMuted">
              Nothing to review. Run fixture ingestion to populate the queue.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.map((p) => (
              <ListRow
                key={p.id}
                leading={<IconBadge icon={KIND_ICON[p.kind]} tone="accent" />}
                title={String(p.payload.name ?? 'Untitled')}
                subtitle={`${p.kind} · ${p.source}`}
                trailing={
                  <span className="flex items-center gap-1">
                    <IconButton icon="check" ariaLabel="Accept" size="sm" variant="surface" onClick={() => decide(p.id, true)} />
                    <IconButton icon="close" ariaLabel="Reject" size="sm" onClick={() => decide(p.id, false)} />
                  </span>
                }
              />
            ))}
          </div>
        )}
      </section>
    </motion.main>
  );
}
