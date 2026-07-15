import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { Avatar, Card, Icon } from '@/components/ui';
import type { TrustLevel } from '@/lib/services/types';

const TRUST: Record<TrustLevel, { label: string; verified: boolean }> = {
  0: { label: 'New neighbour', verified: false },
  1: { label: 'Established neighbour', verified: false },
  2: { label: 'Verified resident', verified: true },
  3: { label: 'Steward', verified: true },
};

/** Author card with trust-era language (spec 07). Shows who posted, since when, and their
 *  standing as tenure copy rather than a raw number. Falls back to the name alone off-network. */
export function AuthorCard({ communityId, profileId, fallbackName }: { communityId: string; profileId: string; fallbackName: string }) {
  const services = useServices();
  const q = useQuery({
    queryKey: ['members', communityId],
    queryFn: () => services.memberships.membersOf(communityId),
    enabled: Boolean(communityId),
  });
  const member = q.data?.find((m) => m.profileId === profileId);
  const name = member?.displayName ?? fallbackName;
  const trust = member ? TRUST[member.trustLevel] : null;
  const since = member ? new Date(member.joinedAt).toLocaleString('en-GB', { month: 'long', year: 'numeric' }) : null;

  return (
    <Card className="flex items-center gap-3">
      <Avatar name={name} {...(member?.avatarUrl ? { src: member.avatarUrl } : {})} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-body font-semibold text-text">
          {name}
          {trust?.verified && <Icon name="shield" size={14} className="shrink-0 text-positive" />}
        </p>
        <p className="truncate text-small text-textMuted">
          {since ? `Neighbour since ${since}` : 'Neighbour'}{trust ? ` · ${trust.label}` : ''}
        </p>
      </div>
    </Card>
  );
}
