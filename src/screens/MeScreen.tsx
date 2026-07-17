import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cardEnter, screenEnter } from '@/lib/motion';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership, useSession, useSessionStore } from '@/app/state/session';
import { Avatar, Button, Card, Chip, EmptyState, Icon, IconBadge, ListRow, useToasts } from '@/components/ui';
import { EditProfileSheet } from '@/screens/EditProfileSheet';
import { IDENTITY_LABEL, labelFor } from '@/lib/labels';
import type { TrustLevel } from '@/lib/services/types';

const TRUST_LABEL: Record<TrustLevel, string> = {
  0: 'New neighbour', 1: 'Established', 2: 'Verified resident', 3: 'Steward',
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
  const [editOpen, setEditOpen] = useState(false);

  const membersQuery = useQuery({ queryKey: ['members', communityId], queryFn: () => services.memberships.membersOf(communityId), enabled: Boolean(communityId) });
  const invitesQuery = useQuery({ queryKey: ['invites', communityId], queryFn: () => services.invites.mine(communityId), enabled: Boolean(communityId) });
  const listingsQuery = useQuery({ queryKey: ['listings', communityId], queryFn: () => services.listings.list(communityId), enabled: Boolean(communityId) });
  const requestsQuery = useQuery({ queryKey: ['requests', communityId], queryFn: () => services.requests.list(communityId), enabled: Boolean(communityId) });
  const eventsQuery = useQuery({ queryKey: ['events', communityId], queryFn: () => services.events.list(communityId), enabled: Boolean(communityId) });
  const equipmentQuery = useQuery({ queryKey: ['directory', 'equipment', communityId], queryFn: () => services.directory.equipment(communityId), enabled: Boolean(communityId) });
  const skillsQuery = useQuery({ queryKey: ['directory', 'skills', communityId], queryFn: () => services.directory.skills(communityId), enabled: Boolean(communityId) });
  const servicesQuery = useQuery({ queryKey: ['directory', 'services', communityId], queryFn: () => services.directory.services(communityId), enabled: Boolean(communityId) });

  const me = membersQuery.data?.find((m) => m.profileId === session?.profileId);
  const trust = active?.trustLevel ?? 0;
  const since = me ? new Date(me.joinedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
  const uid = session?.profileId;
  const myListings = (listingsQuery.data ?? []).filter((l) => l.createdBy === uid);
  const myRequests = (requestsQuery.data ?? []).filter((r) => r.createdBy === uid);
  const myEvents = (eventsQuery.data ?? []).filter((e) => e.createdBy === uid);
  const hasActivity = myListings.length + myRequests.length + myEvents.length > 0;
  const myEquipment = (equipmentQuery.data ?? []).filter((e) => e.ownerProfileId === uid);
  const mySkills = (skillsQuery.data ?? []).filter((s) => s.profileId === uid);
  const myServices = (servicesQuery.data ?? []).filter((s) => s.createdBy === uid);
  const hasContributions = myEquipment.length + mySkills.length + myServices.length > 0;

  async function remove(kind: 'equipment' | 'skill' | 'service', id: string) {
    try {
      if (kind === 'equipment') await services.directory.removeEquipment(id);
      else if (kind === 'skill') await services.directory.removeSkill(id);
      else await services.directory.removeService(id);
      await qc.invalidateQueries({ queryKey: ['directory'] });
      push({ title: 'Removed', variant: 'success' });
    } catch (e) {
      push({ title: e instanceof Error ? e.message : 'Could not remove that', variant: 'error' });
    }
  }

  async function createInvite() {
    try {
      await services.invites.create(communityId);
      await qc.invalidateQueries({ queryKey: ['invites', communityId] });
      push({ title: 'Invite link ready', variant: 'success' });
    } catch { push({ title: 'Could not create an invite', variant: 'error' }); }
  }
  async function copyInvite(code: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/j/${code}`);
      push({ title: 'Invite link copied', variant: 'success' });
    } catch { push({ title: `Your invite code is ${code}`, variant: 'info' }); }
  }
  async function signOut() {
    await services.auth.signOut();
    reset();
    navigate('/welcome');
  }

  if (!session) return null;

  return (
    <motion.div variants={screenEnter} initial="initial" animate="animate" className="mx-auto max-w-2xl space-y-5 px-screenX py-6">
      <motion.div variants={cardEnter}>
        <Card variant="featured">
          <div className="flex items-center gap-4">
            <Avatar name={session.profile.displayName} {...(session.profile.avatarUrl ? { src: session.profile.avatarUrl } : {})} size="xl" />
            <div className="min-w-0">
              <h1 className="flex items-center gap-1.5 truncate font-display text-h2 font-bold text-text">
                {session.profile.displayName}
                {trust >= 2 && <Icon name="shield" size={16} className="shrink-0 text-positive" />}
              </h1>
              <p className="text-small text-textMuted">{active ? `Villager since ${since} · ${TRUST_LABEL[trust]}` : 'No community yet'}</p>
            </div>
            <Button variant="secondary" size="sm" leadingIcon="edit" className="ml-auto self-start" onClick={() => setEditOpen(true)}>Edit</Button>
          </div>
          {session.profile.bio && <p className="mt-3 text-body text-text">{session.profile.bio}</p>}
          {me && me.identities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {me.identities.map((id) => <Chip key={id} tone="neutral" selected>{labelFor(IDENTITY_LABEL, id)}</Chip>)}
            </div>
          )}
          {trust < 2 && (
            <p className="mt-3 text-small text-textFaint">
              {trust === 0
                ? 'Join on a neighbour’s invite, or get a vouch, to unlock posting freely.'
                : 'Verify your address to vouch for others and claim businesses.'}
            </p>
          )}
        </Card>
      </motion.div>

      <motion.section variants={cardEnter} className="space-y-3">
        <h2 className="text-h3 font-semibold text-text">My activity</h2>
        {!hasActivity ? (
          <EmptyState icon="sparkle" title="Nothing here yet" body="Your listings, requests and events will show up here with their status." action={{ label: 'List something', onClick: () => navigate('/explore?tab=listings'), leadingIcon: 'plus' }} />
        ) : (
          <div className="space-y-2">
            {myListings.map((l) => (
              <ListRow key={l.id} leading={<IconBadge icon="listings" tone={l.kind === 'free' ? 'positive' : 'accent'} />} title={l.title} subtitle={`Listing · ${l.status}`} onClick={() => navigate(`/listings/${l.id}`)} />
            ))}
            {myRequests.map((r) => (
              <ListRow key={r.id} leading={<IconBadge icon="requests" tone="accent" />} title={r.title} subtitle={`Request · ${r.status}`} onClick={() => navigate(`/requests/${r.id}`)} />
            ))}
            {myEvents.map((e) => (
              <ListRow key={e.id} leading={<IconBadge icon="events" tone="warn" />} title={e.title} subtitle={`Event · ${e.goingCount} going`} onClick={() => navigate(`/events/${e.id}`)} />
            ))}
          </div>
        )}
      </motion.section>

      {hasContributions && (
        <motion.section variants={cardEnter} className="space-y-3">
          <h2 className="text-h3 font-semibold text-text">My skills &amp; equipment</h2>
          <div className="space-y-2">
            {myServices.map((s) => (
              <ListRow key={s.id} leading={<IconBadge icon="services" tone="accent" />} title={s.title} subtitle={`Service · ${s.category}`}
                trailing={<Button variant="ghost" size="sm" leadingIcon="remove" onClick={() => remove('service', s.id)}>Remove</Button>} />
            ))}
            {myEquipment.map((e) => (
              <ListRow key={e.id} leading={<IconBadge icon="equipment" tone="positive" />} title={e.name} subtitle={`Lending · ${e.category}`}
                trailing={<Button variant="ghost" size="sm" leadingIcon="remove" onClick={() => remove('equipment', e.id)}>Remove</Button>} />
            ))}
            {mySkills.map((s) => (
              <ListRow key={s.id} leading={<IconBadge icon="sparkle" tone="purple" />} title={s.skill} subtitle="Skill"
                trailing={<Button variant="ghost" size="sm" leadingIcon="remove" onClick={() => remove('skill', s.id)}>Remove</Button>} />
            ))}
          </div>
        </motion.section>
      )}

      <motion.section variants={cardEnter} className="space-y-3">
        <h2 className="text-h3 font-semibold text-text">Invite neighbours</h2>
        {trust < 1 ? (
          <Card>
            <p className="text-small text-textMuted">You'll be able to invite neighbours once you're established (trust level 1). Joining on a neighbour's invite gets you there straight away.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {(invitesQuery.data ?? []).map((inv) => (
              <ListRow
                key={inv.code}
                leading={<IconBadge icon="people" tone="accent" />}
                title={inv.code}
                subtitle={`${inv.uses}/${inv.maxUses} used`}
                trailing={<button type="button" aria-label="Copy invite link" onClick={() => copyInvite(inv.code)} className="rounded-full p-2 text-textMuted transition-colors hover:text-accent"><Icon name="bookmark" size={18} /></button>}
              />
            ))}
            <Button variant="secondary" size="sm" leadingIcon="plus" onClick={createInvite}>Create invite link</Button>
          </div>
        )}
      </motion.section>

      <motion.section variants={cardEnter} className="space-y-2">
        {(services.isMock || session.profile.platformRole === 'admin') && (
          <ListRow title="Admin console" subtitle={services.isMock ? 'Moderation, members, config (demo)' : 'Moderation, members, config'} leading={<Icon name="shield" size={20} className="text-textMuted" />} onClick={() => navigate('/admin')} />
        )}
        <ListRow title="Settings" leading={<Icon name="settings" size={20} className="text-textMuted" />} onClick={() => navigate('/me/settings')} />
        <ListRow title="Sign out" leading={<Icon name="back" size={20} className="text-textMuted" />} onClick={signOut} />
      </motion.section>

      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} currentIdentities={me?.identities ?? []} />
    </motion.div>
  );
}
