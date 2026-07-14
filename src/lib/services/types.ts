// Domain types — the production shape returned by every service, mock or Supabase-backed.
// M1 subset (communities, people, membership, trust). Extended by later milestones.

export type Skin = 'village' | 'estate' | 'retirement';
export type TrustLevel = 0 | 1 | 2 | 3;
export type CommunityType =
  | 'village'
  | 'estate'
  | 'block'
  | 'retirement'
  | 'park'
  | 'student'
  | 'town';
export type CommunityStatus = 'seeding' | 'launched' | 'archived';
export type JoinedVia = 'postcode' | 'invite' | 'vouch' | 'seed' | 'admin';
export type DmPrivacy = 'members' | 'contacts' | 'nobody';

/** Self-declared identity chips (spec 04 / 07). 16-17s cannot expose the tradesperson chip. */
export type Identity = 'resident' | 'parent' | 'tradesperson' | 'business' | 'club';

export interface CommunityConfig {
  coldDmMinTrust: number;
  listingCapT0: number;
  requestCapT0: number;
  eventsRequireTrust: number;
  alertsCommunityMinTrust: number;
  autoHideReportThreshold: number;
  maxPhotoMb: number;
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  type: CommunityType;
  region: string | null;
  postcodeDistricts: string[];
  skin: Skin;
  status: CommunityStatus;
  config: CommunityConfig;
}

/** Minimal public card returned by discovery (pre-membership). */
export interface CommunityCard {
  id: string;
  slug: string;
  name: string;
  type: CommunityType;
  region: string | null;
  status: CommunityStatus;
}

export interface Profile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  dateOfBirth: string; // ISO date
  platformRole: 'admin' | 'support' | null;
  dmPrivacy: DmPrivacy;
  peopleDirectoryOptIn: boolean;
  notificationPrefs?: Record<string, boolean>;
  createdAt: string;
}

export interface Membership {
  id: string;
  profileId: string;
  communityId: string;
  trustLevel: TrustLevel;
  joinedVia: JoinedVia;
  identities: Identity[];
  status: 'active' | 'suspended' | 'left';
  createdAt: string;
}

/** Membership as carried in the session (denormalised with community display bits). */
export interface MembershipSummary {
  communityId: string;
  slug: string;
  name: string;
  skin: Skin;
  trustLevel: TrustLevel;
  status: 'seeding' | 'launched' | 'archived';
}

export interface MemberSummary {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  trustLevel: TrustLevel;
  identities: Identity[];
  joinedAt: string;
}

export interface Invite {
  code: string;
  communityId: string;
  createdBy: string;
  maxUses: number;
  uses: number;
  expiresAt: string | null;
  createdAt: string;
}

/** The signed-in session shape (spec 09 §Auth). */
export interface Session {
  profileId: string;
  profile: Profile;
  memberships: MembershipSummary[];
  activeCommunityId: string | null;
}

// ---- M2 directory entities -----------------------------------------------------

export type PlaceKind =
  | 'shop' | 'pub' | 'cafe' | 'church' | 'hall' | 'school' | 'green' | 'sports'
  | 'health' | 'service' | 'landmark' | 'transport' | 'utility' | 'other';
export type OrganisationKind =
  | 'council' | 'school' | 'pta' | 'church' | 'club' | 'charity' | 'group' | 'other';

export interface Place {
  id: string;
  communityId: string;
  name: string;
  kind: PlaceKind;
  description: string | null;
  address: string | null;
  photos: string[];
  businessId: string | null;
  organisationId: string | null;
  source: 'seed' | 'member' | 'claimed';
}

export interface Business {
  id: string;
  communityId: string;
  ownerProfileId: string | null;
  name: string;
  categories: string[];
  description: string | null;
  contact: { phone?: string; email?: string; website?: string };
  photos: string[];
  isHomeBusiness: boolean;
  servesAdjacent: boolean;
  source: 'seed' | 'self';
  claimedAt: string | null;
  verifiedAt: string | null;
}

export interface BusinessItem {
  id: string;
  businessId: string;
  kind: 'product' | 'service' | 'offer';
  title: string;
  description: string | null;
  pricePence: number | null;
  active: boolean;
}

export interface Organisation {
  id: string;
  communityId: string;
  name: string;
  kind: OrganisationKind;
  description: string | null;
  verifiedSource: boolean;
  source: 'seed' | 'self';
}

export type ProposalKind = 'place' | 'business' | 'organisation' | 'event';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'merged';

export interface SeedProposal {
  id: string;
  communityId: string;
  kind: ProposalKind;
  source: string;
  payload: Record<string, unknown>;
  status: ProposalStatus;
  createdAt: string;
}

// ---- M3 content lifecycle + messaging ------------------------------------------

export type ListingKind = 'sell' | 'free' | 'wanted' | 'lend';
export type ListingStatus = 'active' | 'reserved' | 'completed' | 'expired' | 'withdrawn';

export interface Listing {
  id: string;
  communityId: string;
  createdBy: string;
  authorName: string;
  kind: ListingKind;
  title: string;
  description: string | null;
  category: string;
  pricePence: number | null;
  status: ListingStatus;
  createdAt: string;
}

export type RequestCategory =
  | 'trades' | 'childcare' | 'lifts' | 'recommendations' | 'borrow' | 'help' | 'pets' | 'other';
export type RequestStatus = 'open' | 'answered' | 'fulfilled' | 'expired' | 'withdrawn';

export interface RequestPost {
  id: string;
  communityId: string;
  createdBy: string;
  authorName: string;
  title: string;
  description: string | null;
  category: RequestCategory;
  status: RequestStatus;
  neededBy: string | null;
  fulfilledBy?: string | null;
  createdAt: string;
}

export type ThreadContext = 'listing' | 'request' | 'event' | 'business' | 'organisation' | 'direct';

export interface ThreadSummary {
  id: string;
  context: ThreadContext;
  contextId: string | null;
  title: string | null;
  otherName: string;
  lastMessageAt: string;
  unread: boolean;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  body: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  category: string;
  title: string;
  body: string | null;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
}

// ---- M4 events / services / skills / equipment ---------------------------------

export type EventCategory = 'community' | 'school' | 'sport' | 'club' | 'church' | 'market' | 'other';
export type RsvpMode = 'none' | 'open' | 'capacity';
export type RsvpStatus = 'going' | 'maybe' | 'waitlist' | 'cancelled';

export interface Event {
  id: string;
  communityId: string;
  createdBy: string;
  authorName: string;
  title: string;
  description: string | null;
  category: EventCategory;
  locationText: string | null;
  startsAt: string;
  endsAt: string | null;
  rsvpMode: RsvpMode;
  capacity: number | null;
  goingCount: number;
  myRsvp: RsvpStatus | null;
}

export interface Service {
  id: string;
  communityId: string;
  createdBy: string;
  authorName: string;
  title: string;
  category: string;
  description: string | null;
  active: boolean;
}

export interface Skill {
  id: string;
  communityId: string;
  profileId: string;
  personName: string;
  skill: string;
  note: string | null;
}

export interface EquipmentItem {
  id: string;
  communityId: string;
  ownerProfileId: string;
  ownerName: string;
  name: string;
  category: string;
  note: string | null;
  lendTerms: string | null;
  available: boolean;
}

// ---- M5 alerts -----------------------------------------------------------------

export type AlertTier = 'community' | 'verified' | 'platform';
export type AlertCategory =
  | 'lostPet' | 'foundItem' | 'lostItem' | 'roadClosure' | 'utilityOutage'
  | 'weather' | 'safety' | 'notice' | 'emergency';

export interface Alert {
  id: string;
  communityId: string;
  createdBy: string | null;
  tier: AlertTier;
  category: AlertCategory;
  title: string;
  body: string | null;
  resolvedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

// ---- M6 search -----------------------------------------------------------------

export type SearchKind =
  | 'business' | 'service' | 'place' | 'organisation' | 'event' | 'listing' | 'request';

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  snippet: string;
}

export const DEFAULT_CONFIG: CommunityConfig = {
  coldDmMinTrust: 1,
  listingCapT0: 2,
  requestCapT0: 1,
  eventsRequireTrust: 1,
  alertsCommunityMinTrust: 1,
  autoHideReportThreshold: 3,
  maxPhotoMb: 10,
};
