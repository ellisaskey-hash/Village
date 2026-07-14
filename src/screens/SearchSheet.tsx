import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/lib/services/provider';
import { useActiveMembership } from '@/app/state/session';
import { EmptyState, IconBadge, ListRow, SearchBar, Sheet, Skeleton, type IconName } from '@/components/ui';
import type { SearchKind } from '@/lib/services/types';

const KIND_ICON: Record<SearchKind, IconName> = {
  business: 'businesses',
  service: 'services',
  place: 'places',
  organisation: 'organisations',
  event: 'events',
  listing: 'listings',
  request: 'requests',
};
const KIND_LABEL: Record<SearchKind, string> = {
  business: 'Business',
  service: 'Service',
  place: 'Place',
  organisation: 'Organisation',
  event: 'Event',
  listing: 'Listing',
  request: 'Request',
};
function routeFor(kind: SearchKind, id: string): string {
  switch (kind) {
    case 'business': return `/businesses/${id}`;
    case 'place': return `/places/${id}`;
    case 'organisation': return `/organisations/${id}`;
    case 'event': return `/events/${id}`;
    case 'listing': return `/listings/${id}`;
    case 'request': return `/requests/${id}`;
    default: return '/explore?tab=directory';
  }
}

export function SearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const services = useServices();
  const navigate = useNavigate();
  const active = useActiveMembership();
  const communityId = active?.communityId ?? '';
  const [query, setQuery] = useState('');

  const q = useQuery({
    queryKey: ['search', communityId, query],
    queryFn: () => services.search.search(communityId, query),
    enabled: open && query.trim().length >= 2,
  });

  return (
    <Sheet open={open} onClose={onClose} title="Search" hero={{ icon: 'search', tone: 'accent' }}>
      <div className="space-y-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Search your community" />
        {query.trim().length < 2 ? (
          <p className="text-small text-textMuted">Find businesses, places, events, listings, requests and more.</p>
        ) : q.isLoading ? (
          <div className="space-y-2"><Skeleton height={56} /><Skeleton height={56} /></div>
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState icon="search" title="Nothing found" body={`No matches for "${query}" yet.`} />
        ) : (
          <div className="space-y-2">
            {q.data.map((r) => (
              <ListRow
                key={`${r.kind}-${r.id}`}
                leading={<IconBadge icon={KIND_ICON[r.kind]} tone="accent" />}
                title={r.title}
                subtitle={`${KIND_LABEL[r.kind]}${r.snippet ? ` · ${r.snippet.slice(0, 60)}` : ''}`}
                onClick={() => {
                  onClose();
                  navigate(routeFor(r.kind, r.id));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
