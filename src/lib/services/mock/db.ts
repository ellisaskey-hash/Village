// In-memory mock database, persisted to localStorage so a review session survives reloads.
// This is the clearly-labelled no-DB implementation (PROGRESS.md DECISION-MADE). It mirrors
// the Postgres schema + RPC behaviour closely enough to exercise every M1 screen.
import {
  DEFAULT_CONFIG,
  type Alert,
  type Business,
  type Community,
  type EquipmentItem,
  type SaveTargetKind,
  type EventCategory,
  type Invite,
  type Listing,
  type Membership,
  type Organisation,
  type Place,
  type Profile,
  type RequestPost,
  type RsvpMode,
  type RsvpStatus,
  type SeedProposal,
  type Service,
  type Skill,
  type ThreadContext,
} from '../types';

export interface MockEvent {
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
  photos?: string[];
}
export interface MockRsvp {
  eventId: string;
  profileId: string;
  status: RsvpStatus;
  partySize: number;
  createdAt: string;
}

export interface MockThread {
  id: string;
  communityId: string;
  context: ThreadContext;
  contextId: string | null;
  title: string | null;
  createdBy: string;
  lastMessageAt: string;
  createdAt: string;
}
export interface MockParticipant {
  threadId: string;
  profileId: string;
  lastReadAt: string;
  leftAt: string | null;
}
export interface MockMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string | null;
  createdAt: string;
}
export interface MockNotification {
  id: string;
  profileId: string;
  category: string;
  title: string;
  body: string | null;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
}

interface AuthRow {
  id: string;
  email: string;
  password: string;
}
export interface MockReport {
  id: string;
  communityId: string;
  reporterId: string;
  targetKind: string;
  targetId: string;
  reason: string;
  note: string | null;
  priority: boolean;
  status: 'open' | 'upheld' | 'dismissed';
  createdAt: string;
}
export interface MockModerationAction {
  id: string;
  communityId: string;
  actorId: string | null;
  targetKind: string;
  targetId: string;
  action: string;
  detail: Record<string, unknown>;
  createdAt: string;
}
export interface MockHidden {
  kind: string;
  id: string;
  reason: string | null;
  hiddenAt: string;
}
export interface MockFirstPostDelay {
  id: string;
  profileId: string;
  communityId: string;
  contentKind: string;
  contentId: string;
  releaseAt: string;
  releasedAt: string | null;
}
interface VouchRow {
  voucherId: string;
  vouchedId: string;
  communityId: string;
}

export interface MockDb {
  auth: AuthRow[];
  profiles: Profile[];
  communities: Community[];
  memberships: Membership[];
  invites: Invite[];
  vouches: VouchRow[];
  places: Place[];
  businesses: Business[];
  organisations: Organisation[];
  seedProposals: SeedProposal[];
  listings: Listing[];
  requests: RequestPost[];
  threads: MockThread[];
  participants: MockParticipant[];
  messages: MockMessage[];
  notifications: MockNotification[];
  saves: { profileId: string; targetKind: SaveTargetKind; targetId: string; targetLabel: string | null; createdAt: string }[];
  events: MockEvent[];
  eventRsvps: MockRsvp[];
  services: Service[];
  skills: Skill[];
  equipment: EquipmentItem[];
  alerts: Alert[];
  reports: MockReport[];
  moderationActions: MockModerationAction[];
  hidden: MockHidden[];
  firstPostDelays: MockFirstPostDelay[];
}

const DB_KEY = 'local:mock-db';
const CURRENT_KEY = 'local:mock-profile';

export function uid(): string {
  return crypto.randomUUID();
}

/** UK postcode outward district (mirror of the SQL postcode_district()). */
export function postcodeDistrict(p: string): string {
  const s = p.replace(/\s/g, '');
  return (s.length <= 3 ? s : s.slice(0, -3)).toUpperCase();
}

function seed(): MockDb {
  return {
    auth: [],
    profiles: [],
    communities: [
      {
        id: uid(),
        slug: 'horsmonden',
        name: 'Horsmonden',
        type: 'village',
        region: 'Kent, England',
        postcodeDistricts: ['TN12'],
        skin: 'village',
        status: 'seeding',
        config: DEFAULT_CONFIG,
      },
      {
        id: uid(),
        slug: 'dev-village',
        name: 'Dev Village',
        type: 'village',
        region: 'Testshire',
        postcodeDistricts: ['DV1'],
        skin: 'village',
        status: 'launched',
        config: DEFAULT_CONFIG,
      },
    ],
    memberships: [],
    invites: [],
    vouches: [],
    places: [],
    businesses: [],
    organisations: [],
    seedProposals: [],
    listings: [],
    requests: [],
    threads: [],
    participants: [],
    messages: [],
    notifications: [],
    saves: [],
    events: [],
    eventRsvps: [],
    services: [],
    skills: [],
    equipment: [],
    alerts: [],
    reports: [],
    moderationActions: [],
    hidden: [],
    firstPostDelays: [],
  };
}

let cache: MockDb | null = null;

export function db(): MockDb {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(DB_KEY);
    cache = raw ? (JSON.parse(raw) as MockDb) : seed();
  } catch {
    cache = seed();
  }
  // Fill collections added after a session's DB was first persisted (forward-compatible).
  cache.reports ??= [];
  cache.moderationActions ??= [];
  cache.hidden ??= [];
  cache.firstPostDelays ??= [];
  return cache;
}

export function persist(): void {
  if (!cache) return;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable — mock lives in memory only */
  }
}

export function getCurrentProfileId(): string | null {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}
export function setCurrentProfileId(id: string | null): void {
  try {
    if (id) localStorage.setItem(CURRENT_KEY, id);
    else localStorage.removeItem(CURRENT_KEY);
  } catch {
    /* ignore */
  }
}

/** Test / dev helper: wipe the mock database and current user. */
export function resetMock(): void {
  cache = seed();
  persist();
  setCurrentProfileId(null);
}
