// Service contracts — the interface every screen codes against, so the mock and the
// Supabase-backed implementation are interchangeable behind one flag (spec 09 §Server state).
import { z } from 'zod';
import type {
  Community,
  CommunityCard,
  Identity,
  Invite,
  MemberSummary,
  Membership,
  Profile,
  Session,
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

export interface Services {
  /** True when running on the in-memory mock (no database). Screens surface a labelled banner. */
  readonly isMock: boolean;
  auth: AuthService;
  communities: CommunityService;
  profiles: ProfileService;
  memberships: MembershipService;
  invites: InviteService;
  vouches: VouchService;
}
