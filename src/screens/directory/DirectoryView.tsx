import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership, useSession } from '@/app/state/session';
import { Avatar, Button, Chip, EmptyState, IconBadge, ListRow, QueryError, Skeleton, useToasts, type IconName } from '@/components/ui';
import { DirectoryCard } from '@/components/content/DirectoryCard';
import { ORGANISATION_KIND_LABEL, PLACE_KIND_LABEL, labelFor } from '@/lib/labels';

type Sub = 'businesses' | 'services' | 'places' | 'equipment' | 'skills' | 'organisations' | 'people';

const SUBS: { value: Sub; label: string; icon: IconName }[] = [
  { value: 'businesses', label: 'Businesses', icon: 'businesses' },
  { value: 'services', label: 'Services', icon: 'services' },
  { value: 'places', label: 'Places', icon: 'places' },
  { value: 'equipment', label: 'Equipment', icon: 'equipment' },
  { value: 'skills', label: 'Skills', icon: 'sparkle' },
  { value: 'organisations', label: 'Organisations', icon: 'organisations' },
  { value: 'people', label: 'People', icon: 'people' },
];

export function DirectoryView() {
  const services = useServices();
  const navigate = useNavigate();
  const active = useActiveMembership();
  const session = useSession();
  const push = useToasts();
  const qc = useQueryClient();
  const communityId = active?.communityId ?? '';
  const canVouch = (active?.trustLevel ?? 0) >= 2;
  const [sub, setSub] = useState<Sub>('businesses');

  async function vouch(profileId: string, name: string) {
    try {
      await services.vouches.vouchFor(profileId, communityId);
      await qc.invalidateQueries({ queryKey: ['members', communityId] });
      push({ title: `You vouched for ${name}`, variant: 'success' });
    } catch (e) {
      push({ title: e instanceof Error ? e.message : 'Could not vouch', variant: 'error' });
    }
  }

  const q = useQuery({
    queryKey: ['directory', sub, communityId],
    enabled: Boolean(communityId),
    queryFn: async () => {
      switch (sub) {
        case 'places': return services.directory.places(communityId);
        case 'organisations': return services.directory.organisations(communityId);
        case 'people': return services.memberships.membersOf(communityId);
        case 'services': return services.directory.services(communityId);
        case 'equipment': return services.directory.equipment(communityId);
        case 'skills': return services.directory.skills(communityId);
        default: return services.directory.businesses(communityId);
      }
    },
  });

  const data = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SUBS.map((s) => (
          <Chip key={s.value} selected={sub === s.value} leadingIcon={s.icon} onClick={() => setSub(s.value)}>
            {s.label}
          </Chip>
        ))}
      </div>

      <motion.div key={sub} variants={screenEnter} initial="initial" animate="animate">
      {q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <div className="space-y-2"><Skeleton height={64} /><Skeleton height={64} /></div>
      ) : data.length === 0 ? (
        <EmptyState icon="places" title="Still setting this up" body="This part of the directory is being seeded. Check back soon." />
      ) : sub === 'people' ? (
        <div className="space-y-2">
          {(data as Awaited<ReturnType<typeof services.memberships.membersOf>>).map((m) => (
            <ListRow
              key={m.profileId}
              leading={<Avatar name={m.displayName} {...(m.avatarUrl ? { src: m.avatarUrl } : {})} size="sm" />}
              title={m.displayName}
              subtitle={m.identities.join(' · ') || 'Neighbour'}
              trailing={canVouch && m.profileId !== session?.profileId && m.trustLevel < 2
                ? <Button variant="ghost" size="sm" leadingIcon="heart" onClick={() => vouch(m.profileId, m.displayName)}>Vouch</Button>
                : undefined}
            />
          ))}
        </div>
      ) : sub === 'businesses' ? (
        <div className="grid grid-cols-2 gap-3">
          {(data as Awaited<ReturnType<typeof services.directory.businesses>>).map((b) => (
            <DirectoryCard
              key={b.id}
              icon="businesses"
              photos={b.photos}
              title={b.name}
              subtitle={b.categories.join(', ') || 'Local business'}
              {...(b.ownerProfileId
                ? (b.verifiedAt ? { badge: { label: 'Verified', tone: 'positive' as const } } : {})
                : { badge: { label: 'Claim it', tone: 'accent' as const } })}
              onClick={() => navigate(`/businesses/${b.id}`)}
            />
          ))}
        </div>
      ) : sub === 'services' ? (
        <div className="space-y-2">
          {(data as Awaited<ReturnType<typeof services.directory.services>>).map((s) => (
            <ListRow key={s.id} leading={<IconBadge icon="services" tone="accent" />} title={s.title} subtitle={`${s.category} · ${s.authorName}`} />
          ))}
        </div>
      ) : sub === 'equipment' ? (
        <div className="space-y-2">
          {(data as Awaited<ReturnType<typeof services.directory.equipment>>).map((e) => (
            <ListRow key={e.id} leading={<IconBadge icon="equipment" tone="positive" />} title={e.name} subtitle={`${e.category} · ${e.ownerName}`} onClick={() => navigate(`/equipment/${e.id}`)} />
          ))}
        </div>
      ) : sub === 'skills' ? (
        <div className="space-y-2">
          {(data as Awaited<ReturnType<typeof services.directory.skills>>).map((s) => (
            <ListRow key={s.id} leading={<IconBadge icon="sparkle" tone="purple" />} title={s.skill} subtitle={s.personName} />
          ))}
        </div>
      ) : sub === 'organisations' ? (
        <div className="space-y-2">
          {(data as Awaited<ReturnType<typeof services.directory.organisations>>).map((o) => (
            <ListRow key={o.id} leading={<IconBadge icon="organisations" tone={o.verifiedSource ? 'info' : 'neutral'} />} title={o.name} subtitle={o.verifiedSource ? 'Verified source' : labelFor(ORGANISATION_KIND_LABEL, o.kind)} onClick={() => navigate(`/organisations/${o.id}`)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {(data as Awaited<ReturnType<typeof services.directory.places>>).map((p) => (
            <DirectoryCard key={p.id} icon="places" photos={p.photos} title={p.name} subtitle={labelFor(PLACE_KIND_LABEL, p.kind)} from="var(--c-positive)" to="var(--c-info)" onClick={() => navigate(`/places/${p.id}`)} />
          ))}
        </div>
      )}
      </motion.div>
    </div>
  );
}
