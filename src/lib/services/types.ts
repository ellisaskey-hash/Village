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

export const DEFAULT_CONFIG: CommunityConfig = {
  coldDmMinTrust: 1,
  listingCapT0: 2,
  requestCapT0: 1,
  eventsRequireTrust: 1,
  alertsCommunityMinTrust: 1,
  autoHideReportThreshold: 3,
  maxPhotoMb: 10,
};
