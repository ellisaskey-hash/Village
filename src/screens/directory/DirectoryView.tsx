import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { Avatar, Chip, EmptyState, IconBadge, ListRow, Skeleton, type IconName } from '@/components/ui';

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
  const communityId = active?.communityId ?? '';
  const [sub, setSub] = useState<Sub>('businesses');

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

      {q.isLoading ? (
        <div className="space-y-2"><Skeleton height={64} /><Skeleton height={64} /></div>
      ) : data.length === 0 ? (
        <EmptyState icon="places" title="Still setting this up" body="This part of the directory is being seeded. Check back soon." />
      ) : sub === 'people' ? (
        <div className="space-y-2">
          {(data as Awaited<ReturnType<typeof services.memberships.membersOf>>).map((m) => (
            <ListRow key={m.profileId} leading={<Avatar name={m.displayName} size="sm" />} title={m.displayName} subtitle={m.identities.join(' · ') || 'Neighbour'} />
          ))}
        </div>
      ) : sub === 'businesses' ? (
        <div className="space-y-2">
          {(data as Awaited<ReturnType<typeof services.directory.businesses>>).map((b) => (
            <ListRow key={b.id} leading={<IconBadge icon="businesses" tone="accent" />} title={b.name} subtitle={b.categories.join(', ') || (b.ownerProfileId ? 'Local business' : 'Is this yours? Claim it')} onClick={() => navigate(`/businesses/${b.id}`)} />
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
            <ListRow key={o.id} leading={<IconBadge icon="organisations" tone={o.verifiedSource ? 'info' : 'neutral'} />} title={o.name} subtitle={o.verifiedSource ? 'Verified source' : o.kind} onClick={() => navigate(`/organisations/${o.id}`)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(data as Awaited<ReturnType<typeof services.directory.places>>).map((p) => (
            <ListRow key={p.id} leading={<IconBadge icon="places" tone="positive" />} title={p.name} subtitle={p.kind} onClick={() => navigate(`/places/${p.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
