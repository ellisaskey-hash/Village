// Service contracts — the interface every screen codes against, so the mock and the
// Supabase-backed implementation are interchangeable behind one flag (spec 09 §Server state).
import { z } from 'zod';
import type {
  Business,
  Community,
  CommunityCard,
  Identity,
  Invite,
  Listing,
  ListingStatus,
  MemberSummary,
  Membership,
  Message,
  NotificationItem,
  Organisation,
  Place,
  Profile,
  RequestPost,
  RequestStatus,
  SeedProposal,
  Session,
  ThreadContext,
  ThreadSummary,
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
}

// ---- services ------------------------------------------------------------------

export interface AuthService {
  currentSession(): Promise<Session | null>;
  signUp(input: SignUpInput): Promise<Session>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
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
  business(id: string): Promise<Business | null>;
  place(id: string): Promise<Place | null>;
  organisation(id: string): Promise<Organisation | null>;
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
}
