import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership, useSession } from '@/app/state/session';
import { SegmentedControl } from '@/components/ui';

/** "Post as You / your business" selector (spec 07). Renders nothing unless the member owns a
 *  business in this community. Returns the business id (or null for a personal post). */
export function ActingAsSelector({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const services = useServices();
  const active = useActiveMembership();
  const session = useSession();
  const communityId = active?.communityId ?? '';
  const q = useQuery({
    queryKey: ['directory', 'businesses', communityId],
    queryFn: () => services.directory.businesses(communityId),
    enabled: Boolean(communityId),
  });
  const mine = (q.data ?? []).filter((b) => b.ownerProfileId === session?.profileId);
  if (mine.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-small font-medium text-text">Post as</span>
      <SegmentedControl<string>
        ariaLabel="Post as"
        value={value ?? 'me'}
        onChange={(v) => onChange(v === 'me' ? null : v)}
        options={[{ value: 'me', label: 'You' }, ...mine.map((b) => ({ value: b.id, label: b.name }))]}
      />
    </div>
  );
}
