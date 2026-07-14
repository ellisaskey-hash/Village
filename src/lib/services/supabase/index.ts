// Supabase-backed Services — the real seam behind the same contract as the mock. Compiles
// and is written to the schema/RPCs in supabase/migrations; it runs once a project + env
// exist. Until then the app selects the mock (see provider). RLS does the security; these
// methods never re-implement it.
import type {
  JoinInput,
  ProfilePatch,
  Services,
  SignUpInput,
} from '../contracts';
import { joinSchema, signUpSchema } from '../contracts';
import {
  DEFAULT_CONFIG,
  type Business,
  type Community,
  type CommunityCard,
  type Identity,
  type Invite,
  type MemberSummary,
  type Membership,
  type MembershipSummary,
  type Organisation,
  type Place,
  type Profile,
  type SeedProposal,
  type Session,
  type TrustLevel,
} from '../types';
import { horsmondenDrafts } from '@/lib/ingest/horsmondenFixture';
import { getSupabase } from './client';

// ---- row shapes + mappers ------------------------------------------------------

interface DbProfile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth: string;
  platform_role: 'admin' | 'support' | null;
  dm_privacy: Profile['dmPrivacy'];
  people_directory_opt_in: boolean;
  created_at: string;
}
interface DbCommunity {
  id: string;
  slug: string;
  name: string;
  type: Community['type'];
  region: string | null;
  postcode_districts: string[];
  skin: Community['skin'];
  status: Community['status'];
  config: Partial<Community['config']> | null;
}
interface DbMembership {
  id: string;
  profile_id: string;
  community_id: string;
  trust_level: number;
  joined_via: Membership['joinedVia'];
  identities: Identity[];
  status: Membership['status'];
  created_at: string;
}

function mapProfile(r: DbProfile): Profile {
  return {
    id: r.id,
    displayName: r.display_name,
    email: r.email,
    avatarUrl: r.avatar_url,
    bio: r.bio,
    dateOfBirth: r.date_of_birth,
    platformRole: r.platform_role,
    dmPrivacy: r.dm_privacy,
    peopleDirectoryOptIn: r.people_directory_opt_in,
    createdAt: r.created_at,
  };
}
function mapCommunity(r: DbCommunity): Community {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    type: r.type,
    region: r.region,
    postcodeDistricts: r.postcode_districts,
    skin: r.skin,
    status: r.status,
    config: { ...DEFAULT_CONFIG, ...(r.config ?? {}) },
  };
}
interface DbPlace {
  id: string; community_id: string; name: string; kind: Place['kind'];
  description: string | null; address: string | null; photos: string[];
  business_id: string | null; organisation_id: string | null; source: Place['source'];
}
interface DbBusiness {
  id: string; community_id: string; owner_profile_id: string | null; name: string;
  categories: string[]; description: string | null; contact: Business['contact'];
  photos: string[]; is_home_business: boolean; serves_adjacent: boolean;
  source: Business['source']; claimed_at: string | null; verified_at: string | null;
}
interface DbOrganisation {
  id: string; community_id: string; name: string; kind: Organisation['kind'];
  description: string | null; verified_source: boolean; source: Organisation['source'];
}
interface DbSeedProposal {
  id: string; community_id: string; kind: SeedProposal['kind']; source: string;
  payload: Record<string, unknown>; status: SeedProposal['status']; created_at: string;
}

function mapPlace(r: DbPlace): Place {
  return {
    id: r.id, communityId: r.community_id, name: r.name, kind: r.kind,
    description: r.description, address: r.address, photos: r.photos ?? [],
    businessId: r.business_id, organisationId: r.organisation_id, source: r.source,
  };
}
function mapBusiness(r: DbBusiness): Business {
  return {
    id: r.id, communityId: r.community_id, ownerProfileId: r.owner_profile_id, name: r.name,
    categories: r.categories ?? [], description: r.description, contact: r.contact ?? {},
    photos: r.photos ?? [], isHomeBusiness: r.is_home_business, servesAdjacent: r.serves_adjacent,
    source: r.source, claimedAt: r.claimed_at, verifiedAt: r.verified_at,
  };
}
function mapOrganisation(r: DbOrganisation): Organisation {
  return {
    id: r.id, communityId: r.community_id, name: r.name, kind: r.kind,
    description: r.description, verifiedSource: r.verified_source, source: r.source,
  };
}
function mapProposal(r: DbSeedProposal): SeedProposal {
  return {
    id: r.id, communityId: r.community_id, kind: r.kind, source: r.source,
    payload: r.payload, status: r.status, createdAt: r.created_at,
  };
}

function mapMembership(r: DbMembership): Membership {
  return {
    id: r.id,
    profileId: r.profile_id,
    communityId: r.community_id,
    trustLevel: r.trust_level as TrustLevel,
    joinedVia: r.joined_via,
    identities: r.identities ?? [],
    status: r.status,
    createdAt: r.created_at,
  };
}

async function buildSession(): Promise<Session | null> {
  const sb = getSupabase();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: profileRow } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (!profileRow) return null;
  const profile = mapProfile(profileRow as DbProfile);

  const { data: rows } = await sb
    .from('memberships')
    .select('trust_level, status, communities(id, slug, name, skin, status)')
    .eq('profile_id', user.id)
    .eq('status', 'active');

  const memberships: MembershipSummary[] = (rows ?? []).map((row) => {
    const r = row as unknown as {
      trust_level: number;
      communities: { id: string; slug: string; name: string; skin: Community['skin']; status: MembershipSummary['status'] };
    };
    return {
      communityId: r.communities.id,
      slug: r.communities.slug,
      name: r.communities.name,
      skin: r.communities.skin,
      trustLevel: r.trust_level as TrustLevel,
      status: r.communities.status,
    };
  });

  return { profileId: user.id, profile, memberships, activeCommunityId: memberships[0]?.communityId ?? null };
}

export function createSupabaseServices(): Services {
  return {
    isMock: false,

    auth: {
      async currentSession() {
        return buildSession();
      },
      async signUp(input: SignUpInput) {
        const parsed = signUpSchema.parse(input);
        const sb = getSupabase();
        const { data, error } = await sb.auth.signUp({ email: parsed.email, password: parsed.password });
        if (error) throw error;
        const user = data.user;
        if (!user) throw new Error('Check your email to confirm your account');
        const { error: pErr } = await sb.from('profiles').insert({
          id: user.id,
          display_name: parsed.displayName,
          email: parsed.email,
          date_of_birth: parsed.dateOfBirth,
        });
        if (pErr) throw pErr;
        const session = await buildSession();
        if (!session) throw new Error('Check your email to confirm your account');
        return session;
      },
      async signIn(email: string, password: string) {
        const sb = getSupabase();
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const session = await buildSession();
        if (!session) throw new Error('Could not load your account');
        return session;
      },
      async signOut() {
        await getSupabase().auth.signOut();
      },
    },

    communities: {
      async discover(postcode: string): Promise<CommunityCard[]> {
        const { data, error } = await getSupabase().rpc('discover_communities', { postcode });
        if (error) throw error;
        return (data ?? []) as CommunityCard[];
      },
      async getBySlug(slug: string) {
        const { data, error } = await getSupabase().from('communities').select('*').eq('slug', slug).maybeSingle();
        if (error) throw error;
        return data ? mapCommunity(data as DbCommunity) : null;
      },
      async join(input: JoinInput) {
        const parsed = joinSchema.parse(input);
        const { data, error } = await getSupabase().rpc('join_community', {
          slug: parsed.slug,
          postcode: parsed.postcode ?? null,
          invite_code: parsed.inviteCode ?? null,
        });
        if (error) throw error;
        return mapMembership(data as DbMembership);
      },
    },

    profiles: {
      async update(patch: ProfilePatch) {
        const sb = getSupabase();
        const { data: auth } = await sb.auth.getUser();
        if (!auth.user) throw new Error('Not signed in');
        const dbPatch: Record<string, unknown> = {};
        if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName;
        if (patch.bio !== undefined) dbPatch.bio = patch.bio;
        if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;
        if (patch.dmPrivacy !== undefined) dbPatch.dm_privacy = patch.dmPrivacy;
        if (patch.peopleDirectoryOptIn !== undefined)
          dbPatch.people_directory_opt_in = patch.peopleDirectoryOptIn;
        const { data, error } = await sb
          .from('profiles')
          .update(dbPatch)
          .eq('id', auth.user.id)
          .select('*')
          .single();
        if (error) throw error;
        return mapProfile(data as DbProfile);
      },
    },

    memberships: {
      async membersOf(communityId: string): Promise<MemberSummary[]> {
        const { data, error } = await getSupabase()
          .from('memberships')
          .select('profile_id, trust_level, identities, created_at, profiles(display_name, avatar_url)')
          .eq('community_id', communityId)
          .eq('status', 'active');
        if (error) throw error;
        return (data ?? []).map((row) => {
          const r = row as unknown as {
            profile_id: string;
            trust_level: number;
            identities: Identity[];
            created_at: string;
            profiles: { display_name: string; avatar_url: string | null };
          };
          return {
            profileId: r.profile_id,
            displayName: r.profiles.display_name,
            avatarUrl: r.profiles.avatar_url,
            trustLevel: r.trust_level as TrustLevel,
            identities: r.identities ?? [],
            joinedAt: r.created_at,
          };
        });
      },
      async updateIdentities(communityId: string, identities: Identity[]) {
        const sb = getSupabase();
        const { data: auth } = await sb.auth.getUser();
        if (!auth.user) throw new Error('Not signed in');
        const { data, error } = await sb
          .from('memberships')
          .update({ identities })
          .eq('community_id', communityId)
          .eq('profile_id', auth.user.id)
          .select('*')
          .single();
        if (error) throw error;
        return mapMembership(data as DbMembership);
      },
    },

    invites: {
      async create(communityId: string): Promise<Invite> {
        const sb = getSupabase();
        const { data: auth } = await sb.auth.getUser();
        if (!auth.user) throw new Error('Not signed in');
        const code = Array.from({ length: 6 }, () =>
          'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charAt(Math.floor(Math.random() * 32)),
        ).join('');
        const { data, error } = await sb
          .from('invites')
          .insert({ code, community_id: communityId, created_by: auth.user.id })
          .select('*')
          .single();
        if (error) throw error;
        const r = data as { code: string; community_id: string; created_by: string; max_uses: number; uses: number; expires_at: string | null; created_at: string };
        return {
          code: r.code,
          communityId: r.community_id,
          createdBy: r.created_by,
          maxUses: r.max_uses,
          uses: r.uses,
          expiresAt: r.expires_at,
          createdAt: r.created_at,
        };
      },
      async mine(communityId: string): Promise<Invite[]> {
        const { data, error } = await getSupabase()
          .from('invites')
          .select('*')
          .eq('community_id', communityId);
        if (error) throw error;
        return (data ?? []).map((row) => {
          const r = row as { code: string; community_id: string; created_by: string; max_uses: number; uses: number; expires_at: string | null; created_at: string };
          return {
            code: r.code,
            communityId: r.community_id,
            createdBy: r.created_by,
            maxUses: r.max_uses,
            uses: r.uses,
            expiresAt: r.expires_at,
            createdAt: r.created_at,
          };
        });
      },
    },

    vouches: {
      async vouchFor(profileId: string, communityId: string) {
        const { error } = await getSupabase().rpc('vouch_for', {
          vouched: profileId,
          community: communityId,
        });
        if (error) throw error;
      },
    },

    directory: {
      async places(communityId: string) {
        const { data, error } = await getSupabase().from('places').select('*').eq('community_id', communityId);
        if (error) throw error;
        return (data ?? []).map((r) => mapPlace(r as DbPlace));
      },
      async businesses(communityId: string) {
        const { data, error } = await getSupabase().from('businesses').select('*').eq('community_id', communityId);
        if (error) throw error;
        return (data ?? []).map((r) => mapBusiness(r as DbBusiness));
      },
      async organisations(communityId: string) {
        const { data, error } = await getSupabase().from('organisations').select('*').eq('community_id', communityId);
        if (error) throw error;
        return (data ?? []).map((r) => mapOrganisation(r as DbOrganisation));
      },
      async business(id: string) {
        const { data, error } = await getSupabase().from('businesses').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data ? mapBusiness(data as DbBusiness) : null;
      },
      async place(id: string) {
        const { data, error } = await getSupabase().from('places').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data ? mapPlace(data as DbPlace) : null;
      },
      async organisation(id: string) {
        const { data, error } = await getSupabase().from('organisations').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data ? mapOrganisation(data as DbOrganisation) : null;
      },
    },

    claims: {
      async claim(businessId: string, evidence: string, linkToken?: string) {
        const { error } = await getSupabase().rpc('claim_business', {
          business_id: businessId,
          evidence,
          link_token: linkToken ?? null,
        });
        if (error) throw error;
      },
    },

    seeding: {
      async proposals(communityId: string) {
        const { data, error } = await getSupabase()
          .from('seed_proposals')
          .select('*')
          .eq('community_id', communityId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((r) => mapProposal(r as DbSeedProposal));
      },
      async runFixtureIngestion(communityId: string) {
        // Fixture ingestion writes proposals only (spec 08). The live api/seed-ingest
        // function does the same from real sources (AWAITING-KEYS).
        const drafts = horsmondenDrafts();
        const rows = drafts.map((d) => ({
          community_id: communityId,
          kind: d.kind,
          source: d.source,
          payload: d.payload,
        }));
        const { error } = await getSupabase().from('seed_proposals').insert(rows);
        if (error) throw error;
        return drafts.length;
      },
      async decide(proposalId: string, accept: boolean) {
        const sb = getSupabase();
        if (accept) {
          const { error } = await sb.rpc('accept_seed_proposal', { proposal_id: proposalId });
          if (error) throw error;
        } else {
          const { error } = await sb
            .from('seed_proposals')
            .update({ status: 'rejected', decided_at: new Date().toISOString() })
            .eq('id', proposalId);
          if (error) throw error;
        }
      },
      async launch(communityId: string) {
        const { error } = await getSupabase().rpc('launch_community', { id: communityId });
        if (error) throw error;
      },
    },
  };
}
