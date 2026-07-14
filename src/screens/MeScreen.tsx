import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership, useSession, useSessionStore } from '@/app/state/session';
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  ListRow,
  useToasts,
} from '@/components/ui';
import type { TrustLevel } from '@/lib/services/types';

const TRUST_LABEL: Record<TrustLevel, string> = {
  0: 'New neighbour',
  1: 'Established',
  2: 'Verified resident',
  3: 'Steward',
};

export function MeScreen() {
  const services = useServices();
  const navigate = useNavigate();
  const push = useToasts();
  const session = useSession();
  const active = useActiveMembership();
  const reset = useSessionStore((s) => s.reset);
  const qc = useQueryClient();
  const communityId = active?.communityId ?? '';

  const membersQuery = useQuery({
    queryKey: ['members', communityId],
    queryFn: () => services.memberships.membersOf(communityId),
    enabled: Boolean(communityId),
  });
  const invitesQuery = useQuery({
    queryKey: ['invites', communityId],
    queryFn: () => services.invites.mine(communityId),
    enabled: Boolean(communityId),
  });

  const me = membersQuery.data?.find((m) => m.profileId === session?.profileId);
  const trust = active?.trustLevel ?? 0;
  const since = me
    ? new Date(me.joinedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '';

  async function createInvite() {
    try {
      await services.invites.create(communityId);
      await qc.invalidateQueries({ queryKey: ['invites', communityId] });
      push({ title: 'Invite link ready', variant: 'success' });
    } catch {
      push({ title: 'Could not create an invite', variant: 'error' });
    }
  }

  async function copyInvite(code: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/j/${code}`);
      push({ title: 'Invite link copied', variant: 'success' });
    } catch {
      push({ title: `Your invite code is ${code}`, variant: 'info' });
    }
  }

  async function signOut() {
    await services.auth.signOut();
    reset();
    navigate('/welcome');
  }

  if (!session) return null;

  return (
    <motion.div
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-2xl space-y-sectionGap px-screenX py-6"
    >
      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={session.profile.displayName} size="xl" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-h2 font-bold text-text">
              {session.profile.displayName}
            </h1>
            <p className="text-small text-textMuted">
              {active ? `Villager since ${since} · ${TRUST_LABEL[trust]}` : 'No community yet'}
            </p>
          </div>
        </div>
        {me && me.identities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {me.identities.map((id) => (
              <Chip key={id} tone="neutral" selected>
                {id}
              </Chip>
            ))}
          </div>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="text-h3 font-semibold text-text">My activity</h2>
        <EmptyState
          icon="sparkle"
          title="Nothing here yet"
          body="Your listings, requests and events will show up here with their status."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-h3 font-semibold text-text">Invite neighbours</h2>
        {trust < 1 ? (
          <Card>
            <p className="text-small text-textMuted">
              You'll be able to invite neighbours once you're established (trust level 1). Joining
              on a neighbour's invite gets you there straight away.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {(invitesQuery.data ?? []).map((inv) => (
              <ListRow
                key={inv.code}
                title={inv.code}
                subtitle={`${inv.uses}/${inv.maxUses} used`}
                trailing={
                  <button
                    type="button"
                    aria-label="Copy invite link"
                    onClick={() => copyInvite(inv.code)}
                    className="rounded-full p-2 text-textMuted transition-colors hover:text-accent"
                  >
                    <Icon name="external-link" size={18} />
                  </button>
                }
              />
            ))}
            <Button variant="secondary" size="sm" leadingIcon="plus" onClick={createInvite}>
              Create invite link
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-2">
        {(services.isMock || session.profile.platformRole === 'admin') && (
          <ListRow
            title="Admin console"
            subtitle={services.isMock ? 'Moderation, members, config (demo)' : 'Moderation, members, config'}
            leading={<Icon name="shield" size={20} className="text-textMuted" />}
            onClick={() => navigate('/admin')}
          />
        )}
        <ListRow title="Settings" leading={<Icon name="settings" size={20} className="text-textMuted" />} onClick={() => navigate('/me/settings')} />
        <ListRow title="Sign out" leading={<Icon name="back" size={20} className="text-textMuted" />} onClick={signOut} />
      </section>
    </motion.div>
  );
}
