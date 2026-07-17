// Service contracts — the interface every screen codes against, so the mock and the
// Supabase-backed implementation are interchangeable behind one flag (spec 09 §Server state).
import { z } from 'zod';
import type {
  Alert,
  Business,
  Community,
  CommunityCard,
  CommunityConfig,
  EquipmentItem,
  Event,
  Identity,
  Invite,
  Listing,
  ListingStatus,
  MemberSummary,
  Membership,
  Message,
  NoticePost,
  NotificationItem,
  Organisation,
  Place,
  Profile,
  RequestPost,
  RequestStatus,
  RsvpStatus,
  SearchResult,
  SeedProposal,
  Service,
  SavedRef,
  SaveTargetKind,
  Session,
  Skill,
  ThreadContext,
  ThreadSummary,
  AdminDashboard,
  AdminMember,
  FirstPostDelay,
  HiddenItem,
  ModerationAction,
  ModerationLogEntry,
  ModerationTargetKind,
  Report,
  TriageSuggestion,
} from './types';

// ---- validated inputs (Zod boundaries, spec 09) --------------------------------

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2, 'Please tell us your name').max(80),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth')
    .refine((d) => {
      const dob = new Date(d + 'T00:00:00');
      const sixteen = new Date();
      sixteen.setFullYear(sixteen.getFullYear() - 16);
      return dob <= sixteen;
    }, 'You need to be 16 or over to join'),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const joinSchema = z
  .object({
    slug: z.string().min(1),
    postcode: z.string().trim().min(2).optional(),
    inviteCode: z.string().trim().min(1).optional(),
  })
  .refine((v) => Boolean(v.postcode) || Boolean(v.inviteCode), {
    message: 'A postcode or an invite is required',
  });
export type JoinInput = z.infer<typeof joinSchema>;

export interface ProfilePatch {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  dmPrivacy?: Profile['dmPrivacy'];
  peopleDirectoryOptIn?: boolean;
  notificationPrefs?: Record<string, boolean>;
}

export const alertSchema = z.object({
  tier: z.enum(['community', 'verified', 'platform']),
  category: z.enum(['lostPet', 'foundItem', 'lostItem', 'roadClosure', 'utilityOutage', 'weather', 'safety', 'notice', 'emergency']),
  title: z.string().trim().min(2).max(140),
  body: z.string().trim().max(1000).optional(),
  asOrganisationId: z.string().optional(),
  photos: z.array(z.string()).max(4).optional(),
});
export type AlertInput = z.infer<typeof alertSchema>;

export interface AlertService {
  list(communityId: string): Promise<Alert[]>;
  post(communityId: string, input: AlertInput): Promise<Alert>;
  resolve(id: string): Promise<void>;
}

export interface SearchService {
  search(communityId: string, query: string): Promise<SearchResult[]>;
}

export const reportSchema = z.object({
  targetKind: z.enum([
    'listing', 'request', 'event', 'alert', 'message', 'profile', 'business',
    'organisation', 'place', 'service', 'equipment', 'organisation_post',
  ]),
  targetId: z.string().min(1),
  reason: z.enum(['scam', 'spam', 'abuse', 'unsafe', 'wrongInfo', 'privacy', 'other']),
  note: z.string().trim().max(1000).optional(),
});
export type ReportInput = z.infer<typeof reportSchema>;

/** Everything the platform admin / steward console reads and acts on (spec 04 §Admin console). */
export interface ModerationService {
  /** The shared Report affordance on every content row and profile. */
  report(input: ReportInput): Promise<void>;
  /** Open reports for a community, priority first. */
  reports(communityId: string): Promise<Report[]>;
  /** Uphold (hide the target) or dismiss a report. */
  decide(reportId: string, uphold: boolean): Promise<void>;
  /** Admin/steward action on a target (hide/unhide/remove/suspend/unsuspend/trustChange/warn/note). */
  moderate(
    action: ModerationAction,
    targetKind: ModerationTargetKind | 'profile',
    targetId: string,
    detail?: Record<string, unknown>,
  ): Promise<void>;
  /** The full, filterable audit trail. */
  log(communityId: string): Promise<ModerationLogEntry[]>;
  /** Currently auto-hidden / hidden items awaiting a decision. */
  hidden(communityId: string): Promise<HiddenItem[]>;
  /** Trust-0 first-post delay queue. */
  delays(communityId: string): Promise<FirstPostDelay[]>;
  /** Release a single delayed first post early (un-hide + mark released). */
  releaseDelay(delayId: string): Promise<void>;
  /** Members with trust + suspension state, for the Members queue. */
  members(communityId: string): Promise<AdminMember[]>;
  dashboard(communityId: string): Promise<AdminDashboard>;
  config(communityId: string, patch: Partial<CommunityConfig>): Promise<Community>;
  /** Advisory AI triage for a report (never auto-acts; fixture when no key). */
  triage(reportId: string): Promise<TriageSuggestion>;
}

export interface MediaService {
  /** Upload image files and return their URLs (Supabase Storage public URLs, or data URIs in
   *  the mock). Used by every composer that accepts photos (spec 07). */
  upload(files: File[]): Promise<string[]>;
}

export interface AccountService {
  /** GDPR export — the caller's own data as a JSON blob for download. */
  export(): Promise<Record<string, unknown>>;
  /** GDPR delete — anonymise authorship, remove PII + push/notifications, then sign out. */
  delete(): Promise<void>;
}

// ---- services ------------------------------------------------------------------

export interface AuthService {
  currentSession(): Promise<Session | null>;
  signUp(input: SignUpInput): Promise<Session>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  /** Sends a password-reset link. Always resolves (never reveals whether the email exists). */
  requestReset(email: string): Promise<void>;
}

export interface CommunityService {
  discover(postcode: string): Promise<CommunityCard[]>;
  getBySlug(slug: string): Promise<Community | null>;
  /** Joins, then the caller refreshes the session. */
  join(input: JoinInput): Promise<Membership>;
}

export interface ProfileService {
  update(patch: ProfilePatch): Promise<Profile>;
}

export interface MembershipService {
  membersOf(communityId: string): Promise<MemberSummary[]>;
  updateIdentities(communityId: string, identities: Identity[]): Promise<Membership>;
}

export interface InviteService {
  create(communityId: string): Promise<Invite>;
  mine(communityId: string): Promise<Invite[]>;
}

export interface VouchService {
  vouchFor(profileId: string, communityId: string): Promise<void>;
}

export interface DirectoryService {
  places(communityId: string): Promise<Place[]>;
  businesses(communityId: string): Promise<Business[]>;
  organisations(communityId: string): Promise<Organisation[]>;
  /** Recent announcements from verified organisations, for the Home noticeboard (spec 07). */
  noticeboard(communityId: string): Promise<NoticePost[]>;
  business(id: string): Promise<Business | null>;
  place(id: string): Promise<Place | null>;
  organisation(id: string): Promise<Organisation | null>;
  // M4 directory
  services(communityId: string): Promise<Service[]>;
  skills(communityId: string): Promise<Skill[]>;
  equipment(communityId: string): Promise<EquipmentItem[]>;
  equipmentItem(id: string): Promise<EquipmentItem | null>;
  addService(communityId: string, input: ServiceInput): Promise<Service>;
  addSkill(communityId: string, skill: string, note?: string): Promise<Skill>;
  addEquipment(communityId: string, input: EquipmentInput): Promise<EquipmentItem>;
  removeService(id: string): Promise<void>;
  removeSkill(id: string): Promise<void>;
  removeEquipment(id: string): Promise<void>;
}

export const eventSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(['community', 'school', 'sport', 'club', 'church', 'market', 'other']),
  startsAt: z.string().min(1, 'Pick a date and time'),
  endsAt: z.string().optional(),
  locationText: z.string().trim().max(200).optional(),
  rsvpMode: z.enum(['none', 'open', 'capacity']),
  capacity: z.number().int().positive().optional(),
  photos: z.array(z.string()).max(4).optional(),
  asBusinessId: z.string().optional(),
});
export type EventInput = z.infer<typeof eventSchema>;

export const serviceSchema = z.object({
  title: z.string().trim().min(2).max(140),
  category: z.string().trim().min(1),
  description: z.string().trim().max(2000).optional(),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

export const equipmentSchema = z.object({
  name: z.string().trim().min(2).max(140),
  category: z.enum(['garden', 'diy', 'transport', 'kitchen', 'events', 'sports', 'other']),
  note: z.string().trim().max(500).optional(),
  lendTerms: z.string().trim().max(300).optional(),
  photos: z.array(z.string()).max(4).optional(),
});
export type EquipmentInput = z.infer<typeof equipmentSchema>;

export interface EventService {
  list(communityId: string): Promise<Event[]>;
  get(id: string): Promise<Event | null>;
  create(communityId: string, input: EventInput): Promise<Event>;
  rsvp(eventId: string, status: RsvpStatus, partySize?: number): Promise<void>;
}

export interface ClaimService {
  /** Self-serve claim; a valid `linkToken` auto-approves (pre-launch claim link, spec 08). */
  claim(businessId: string, evidence: string, linkToken?: string): Promise<void>;
}

export interface SeedingService {
  proposals(communityId: string): Promise<SeedProposal[]>;
  /** Runs the checked-in fixture ingestion; returns the number of proposals created. */
  runFixtureIngestion(communityId: string): Promise<number>;
  decide(proposalId: string, accept: boolean): Promise<void>;
  launch(communityId: string): Promise<void>;
}

export const listingSchema = z.object({
  kind: z.enum(['sell', 'free', 'wanted', 'lend']),
  title: z.string().trim().min(2, 'Give it a short title').max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(1, 'Pick a category'),
  pricePence: z.number().int().nonnegative().optional(),
  condition: z.enum(['new', 'likeNew', 'good', 'fair', 'spares']).optional(),
  photos: z.array(z.string()).max(4).optional(),
  asBusinessId: z.string().optional(),
});
export type ListingInput = z.infer<typeof listingSchema>;

export const requestSchema = z.object({
  title: z.string().trim().min(2, 'What do you need?').max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(['trades', 'childcare', 'lifts', 'recommendations', 'borrow', 'help', 'pets', 'other']),
  neededBy: z.string().optional(),
});
export type RequestInput = z.infer<typeof requestSchema>;

export interface ListingService {
  list(communityId: string): Promise<Listing[]>;
  get(id: string): Promise<Listing | null>;
  create(communityId: string, input: ListingInput): Promise<Listing>;
  setStatus(id: string, status: ListingStatus): Promise<Listing>;
}

export interface RequestService {
  list(communityId: string): Promise<RequestPost[]>;
  get(id: string): Promise<RequestPost | null>;
  create(communityId: string, input: RequestInput): Promise<RequestPost>;
  setStatus(id: string, status: RequestStatus, fulfilledBy?: string): Promise<RequestPost>;
}

export interface ThreadService {
  mine(): Promise<ThreadSummary[]>;
  get(id: string): Promise<{ thread: ThreadSummary; messages: Message[] } | null>;
  /** The only thread-creation path (open_thread RPC). Returns the thread id. */
  open(
    context: ThreadContext,
    contextId: string | null,
    recipient: string | null,
    firstMessage: string,
  ): Promise<string>;
  send(threadId: string, body: string): Promise<Message>;
  markRead(threadId: string): Promise<void>;
}

export interface NotificationService {
  mine(): Promise<NotificationItem[]>;
  markAllRead(): Promise<void>;
  /** Requests permission, subscribes to web-push, saves the subscription. Returns success. */
  enablePush(): Promise<boolean>;
}

export interface SavesService {
  /** The signed-in neighbour's saved listings/requests/events, newest first. */
  list(): Promise<SavedRef[]>;
  add(targetKind: SaveTargetKind, targetId: string, targetLabel: string): Promise<void>;
  remove(targetKind: SaveTargetKind, targetId: string): Promise<void>;
}

export interface Services {
  /** True when running on the in-memory mock (no database). Screens surface a labelled banner. */
  readonly isMock: boolean;
  auth: AuthService;
  communities: CommunityService;
  profiles: ProfileService;
  memberships: MembershipService;
  invites: InviteService;
  vouches: VouchService;
  directory: DirectoryService;
  claims: ClaimService;
  seeding: SeedingService;
  listings: ListingService;
  requests: RequestService;
  threads: ThreadService;
  notifications: NotificationService;
  saves: SavesService;
  events: EventService;
  alerts: AlertService;
  search: SearchService;
  moderation: ModerationService;
  account: AccountService;
  media: MediaService;
}
