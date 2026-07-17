/**
 * Human labels for every user-facing enum. Single source of truth so a raw token
 * (`recommendations`, `tradesperson`, `green_space`) never reaches the UI — VOICE / Law 21.
 * Render `labelFor(map, value)` anywhere a code would otherwise be printed.
 */
import type {
  Identity,
  ListingKind,
  ListingStatus,
  RequestCategory,
  RequestStatus,
  EventCategory,
  PlaceKind,
  OrganisationKind,
  TrustLevel,
} from '@/lib/services/types';

export const IDENTITY_LABEL: Record<Identity, string> = {
  resident: 'Resident',
  parent: 'Parent',
  tradesperson: 'Tradesperson',
  business: 'Business owner',
  club: 'Club or group',
};

/** Identities gated to 18+ at onboarding — reused so the Edit sheet can't bypass the gate. */
export const IDENTITY_ADULT_ONLY: ReadonlySet<Identity> = new Set<Identity>(['tradesperson', 'business']);

export const REQUEST_CATEGORY_LABEL: Record<RequestCategory, string> = {
  trades: 'Trades',
  childcare: 'Childcare',
  lifts: 'Lifts',
  recommendations: 'Recommendations',
  borrow: 'Borrow',
  help: 'A hand',
  pets: 'Pets',
  other: 'Other',
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  open: 'Open',
  answered: 'Answered',
  fulfilled: 'Sorted',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
};

export const LISTING_KIND_LABEL: Record<ListingKind, string> = {
  sell: 'For sale',
  free: 'Free',
  wanted: 'Wanted',
  lend: 'To borrow',
};

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  active: 'Available',
  reserved: 'Reserved',
  completed: 'Sold',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
};

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  community: 'Community',
  school: 'School',
  sport: 'Sport',
  club: 'Club',
  church: 'Church',
  market: 'Market',
  other: 'Other',
};

export const PLACE_KIND_LABEL: Record<PlaceKind, string> = {
  shop: 'Shop',
  pub: 'Pub',
  cafe: 'Café',
  church: 'Church',
  hall: 'Village hall',
  school: 'School',
  green: 'Green space',
  sports: 'Sports ground',
  health: 'Health',
  service: 'Service',
  landmark: 'Landmark',
  transport: 'Transport',
  utility: 'Utility',
  other: 'Other',
};

export const ORGANISATION_KIND_LABEL: Record<OrganisationKind, string> = {
  council: 'Parish council',
  school: 'School',
  pta: 'PTA',
  church: 'Church',
  club: 'Club',
  charity: 'Charity',
  group: 'Community group',
  other: 'Other',
};

/** Trust tiers, longest-form. `AuthorCard` keeps its own richer copy; admin/config use these. */
export const TRUST_LABEL: Record<TrustLevel, string> = {
  0: 'New',
  1: 'Established',
  2: 'Verified',
  3: 'Steward',
};

/** Defensive lookup: returns the label, or a title-cased fallback if a value is ever off-map. */
export function labelFor<T extends string | number>(map: Record<T, string>, value: T): string {
  return map[value] ?? String(value).replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
