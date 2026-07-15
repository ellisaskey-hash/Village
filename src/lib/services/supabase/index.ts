// Supabase-backed Services — the real seam behind the same contract as the mock. Compiles
// and is written to the schema/RPCs in supabase/migrations; it runs once a project + env
// exist. Until then the app selects the mock (see provider). RLS does the security; these
// methods never re-implement it.
import type {
  EquipmentInput,
  EventInput,
  JoinInput,
  ListingInput,
  ProfilePatch,
  RequestInput,
  ServiceInput,
  Services,
  SignUpInput,
} from '../contracts';
import {
  alertSchema,
  equipmentSchema,
  eventSchema,
  joinSchema,
  listingSchema,
  requestSchema,
  serviceSchema,
  signUpSchema,
  type AlertInput,
} from '../contracts';
import {
  DEFAULT_CONFIG,
  type Alert,
  type Business,
  type Community,
  type CommunityCard,
  type Identity,
  type Invite,
  type MemberSummary,
  type Membership,
  type MembershipSummary,
  type EquipmentItem,
  type Event,
  type Listing,
  type ListingStatus,
  type Message,
  type NoticePost,
  type NotificationItem,
  type Organisation,
  type Place,
  type Profile,
  type RequestPost,
  type RequestStatus,
  type RsvpStatus,
  type SearchResult,
  type SeedProposal,
  type Service,
  type Session,
  type Skill,
  type ThreadContext,
  type ThreadSummary,
  type TrustLevel,
  type AdminDashboard,
  type AdminMember,
  type FirstPostDelay,
  type HiddenItem,
  type ModerationAction,
  type ModerationLogEntry,
  type ModerationTargetKind,
  type Report,
  type TriageSuggestion,
} from '../types';
import { reportSchema } from '../contracts';
import { horsmondenDrafts } from '@/lib/ingest/horsmondenFixture';
import { triageReport } from '@/lib/moderation/triage';
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
  notification_prefs: Record<string, boolean> | null;
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
  suspended_until: string | null;
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
    notificationPrefs: r.notification_prefs ?? {},
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

interface DbListing {
  id: string; community_id: string; created_by: string; kind: Listing['kind']; title: string;
  description: string | null; category: string; price_pence: number | null; status: ListingStatus;
  photos?: string[] | null; created_at: string; hidden_at?: string | null; profiles?: { display_name: string } | null;
}
interface DbRequest {
  id: string; community_id: string; created_by: string; title: string; description: string | null;
  category: RequestPost['category']; status: RequestStatus; needed_by: string | null;
  fulfilled_by: string | null; created_at: string; hidden_at?: string | null; profiles?: { display_name: string } | null;
}
function mapListing(r: DbListing): Listing {
  return {
    id: r.id, communityId: r.community_id, createdBy: r.created_by, authorName: r.profiles?.display_name ?? '',
    kind: r.kind, title: r.title, description: r.description, category: r.category,
    pricePence: r.price_pence, status: r.status, photos: r.photos ?? [], hidden: Boolean(r.hidden_at), createdAt: r.created_at,
  };
}
function mapRequest(r: DbRequest): RequestPost {
  return {
    id: r.id, communityId: r.community_id, createdBy: r.created_by, authorName: r.profiles?.display_name ?? '',
    title: r.title, description: r.description, category: r.category, status: r.status,
    neededBy: r.needed_by, fulfilledBy: r.fulfilled_by, hidden: Boolean(r.hidden_at), createdAt: r.created_at,
  };
}
const LISTING_SELECT = '*, profiles!listings_created_by_fkey(display_name)';
const REQUEST_SELECT = '*, profiles!requests_created_by_fkey(display_name)';

interface DbEvent {
  id: string; community_id: string; created_by: string; title: string; description: string | null;
  category: Event['category']; location_text: string | null; starts_at: string; ends_at: string | null;
  rsvp_mode: Event['rsvpMode']; capacity: number | null; photos?: string[] | null; profiles?: { display_name: string } | null;
}
interface DbRsvp { event_id: string; profile_id: string; status: RsvpStatus; party_size: number }
function mapEvent(r: DbEvent, rsvps: DbRsvp[], me: string | undefined): Event {
  const going = rsvps.filter((x) => x.event_id === r.id && x.status === 'going').reduce((s, x) => s + (x.party_size || 0), 0);
  const mine = me ? (rsvps.find((x) => x.event_id === r.id && x.profile_id === me)?.status ?? null) : null;
  return {
    id: r.id, communityId: r.community_id, createdBy: r.created_by, authorName: r.profiles?.display_name ?? '',
    title: r.title, description: r.description, category: r.category, locationText: r.location_text,
    startsAt: r.starts_at, endsAt: r.ends_at, rsvpMode: r.rsvp_mode, capacity: r.capacity,
    photos: r.photos ?? [], goingCount: going, myRsvp: mine,
  };
}
interface DbService { id: string; community_id: string; created_by: string; title: string; category: string; description: string | null; active: boolean; profiles?: { display_name: string } | null }
function mapService(r: DbService): Service {
  return { id: r.id, communityId: r.community_id, createdBy: r.created_by, authorName: r.profiles?.display_name ?? '', title: r.title, category: r.category, description: r.description, active: r.active };
}
interface DbSkill { id: string; community_id: string; profile_id: string; skill: string; note: string | null; profiles?: { display_name: string } | null }
function mapSkill(r: DbSkill): Skill {
  return { id: r.id, communityId: r.community_id, profileId: r.profile_id, personName: r.profiles?.display_name ?? '', skill: r.skill, note: r.note };
}
interface DbEquip { id: string; community_id: string; owner_profile_id: string; name: string; category: string; note: string | null; lend_terms: string | null; available: boolean; profiles?: { display_name: string } | null }
function mapEquip(r: DbEquip): EquipmentItem {
  return { id: r.id, communityId: r.community_id, ownerProfileId: r.owner_profile_id, ownerName: r.profiles?.display_name ?? '', name: r.name, category: r.category, note: r.note, lendTerms: r.lend_terms, available: r.available };
}
interface DbAlert {
  id: string; community_id: string; created_by: string | null; tier: Alert['tier']; category: Alert['category'];
  title: string; body: string | null; resolved_at: string | null; expires_at: string; created_at: string;
}
function mapAlert(r: DbAlert): Alert {
  return {
    id: r.id, communityId: r.community_id, createdBy: r.created_by, tier: r.tier, category: r.category,
    title: r.title, body: r.body, resolvedAt: r.resolved_at, expiresAt: r.expires_at, createdAt: r.created_at,
  };
}
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
const SVC_SEL = '*, profiles!services_created_by_fkey(display_name)';
const EQ_SEL = '*, profiles!equipment_items_owner_profile_id_fkey(display_name)';
const EV_SEL = '*, profiles!events_created_by_fkey(display_name)';

function mapMembership(r: DbMembership): Membership {
  return {
    id: r.id,
    profileId: r.profile_id,
    communityId: r.community_id,
    trustLevel: r.trust_level as TrustLevel,
    joinedVia: r.joined_via,
    identities: r.identities ?? [],
    status: r.status,
    suspendedUntil: r.suspended_until ?? null,
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
        if (patch.notificationPrefs !== undefined) dbPatch.notification_prefs = patch.notificationPrefs;
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
      async noticeboard(communityId: string): Promise<NoticePost[]> {
        const { data, error } = await getSupabase()
          .from('organisation_posts')
          .select('id, title, body, created_at, organisations!inner(id, name, community_id, verified_source)')
          .eq('organisations.community_id', communityId)
          .eq('kind', 'announcement')
          .order('created_at', { ascending: false })
          .limit(6);
        if (error) throw error;
        return ((data ?? []) as unknown[]).map((row) => {
          const r = row as { id: string; title: string; body: string | null; created_at: string; organisations: { id: string; name: string; verified_source: boolean } };
          return { id: r.id, organisationId: r.organisations.id, organisationName: r.organisations.name, title: r.title, body: r.body, verified: r.organisations.verified_source, createdAt: r.created_at };
        });
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
      async services(communityId: string) {
        const { data, error } = await getSupabase().from('services').select(SVC_SEL).eq('community_id', communityId).eq('active', true);
        if (error) throw error;
        return (data ?? []).map((r) => mapService(r as unknown as DbService));
      },
      async skills(communityId: string) {
        const { data, error } = await getSupabase().from('skills').select('*, profiles(display_name)').eq('community_id', communityId);
        if (error) throw error;
        return (data ?? []).map((r) => mapSkill(r as unknown as DbSkill));
      },
      async equipment(communityId: string) {
        const { data, error } = await getSupabase().from('equipment_items').select(EQ_SEL).eq('community_id', communityId);
        if (error) throw error;
        return (data ?? []).map((r) => mapEquip(r as unknown as DbEquip));
      },
      async equipmentItem(id: string) {
        const { data, error } = await getSupabase().from('equipment_items').select(EQ_SEL).eq('id', id).maybeSingle();
        if (error) throw error;
        return data ? mapEquip(data as unknown as DbEquip) : null;
      },
      async addService(communityId: string, input: ServiceInput) {
        const p = serviceSchema.parse(input);
        const { data, error } = await getSupabase().from('services').insert({ community_id: communityId, title: p.title, category: p.category, description: p.description ?? null }).select(SVC_SEL).single();
        if (error) throw error;
        return mapService(data as unknown as DbService);
      },
      async addSkill(communityId: string, skill: string, note?: string) {
        const { data, error } = await getSupabase().from('skills').insert({ community_id: communityId, skill, note: note ?? null }).select('*, profiles(display_name)').single();
        if (error) throw error;
        return mapSkill(data as unknown as DbSkill);
      },
      async addEquipment(communityId: string, input: EquipmentInput) {
        const p = equipmentSchema.parse(input);
        const { data, error } = await getSupabase().from('equipment_items').insert({ community_id: communityId, name: p.name, category: p.category, note: p.note ?? null, lend_terms: p.lendTerms ?? null }).select(EQ_SEL).single();
        if (error) throw error;
        return mapEquip(data as unknown as DbEquip);
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

    listings: {
      async list(communityId: string) {
        const { data, error } = await getSupabase()
          .from('listings').select(LISTING_SELECT).eq('community_id', communityId)
          .neq('status', 'withdrawn').order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map((r) => mapListing(r as unknown as DbListing));
      },
      async get(id: string) {
        const { data, error } = await getSupabase().from('listings').select(LISTING_SELECT).eq('id', id).maybeSingle();
        if (error) throw error;
        return data ? mapListing(data as unknown as DbListing) : null;
      },
      async create(communityId: string, input: ListingInput) {
        const parsed = listingSchema.parse(input);
        const { data, error } = await getSupabase()
          .from('listings')
          .insert({
            community_id: communityId, kind: parsed.kind, title: parsed.title,
            description: parsed.description ?? null, category: parsed.category,
            price_pence: parsed.pricePence ?? null,
          })
          .select(LISTING_SELECT).single();
        if (error) throw error;
        return mapListing(data as unknown as DbListing);
      },
      async setStatus(id: string, status: ListingStatus) {
        const { data, error } = await getSupabase().rpc('set_listing_status', { p_id: id, p_status: status });
        if (error) throw error;
        return mapListing(data as unknown as DbListing);
      },
    },

    requests: {
      async list(communityId: string) {
        const { data, error } = await getSupabase()
          .from('requests').select(REQUEST_SELECT).eq('community_id', communityId)
          .neq('status', 'withdrawn').order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map((r) => mapRequest(r as unknown as DbRequest));
      },
      async get(id: string) {
        const { data, error } = await getSupabase().from('requests').select(REQUEST_SELECT).eq('id', id).maybeSingle();
        if (error) throw error;
        return data ? mapRequest(data as unknown as DbRequest) : null;
      },
      async create(communityId: string, input: RequestInput) {
        const parsed = requestSchema.parse(input);
        const { data, error } = await getSupabase()
          .from('requests')
          .insert({
            community_id: communityId, title: parsed.title, description: parsed.description ?? null,
            category: parsed.category, needed_by: parsed.neededBy ?? null,
          })
          .select(REQUEST_SELECT).single();
        if (error) throw error;
        return mapRequest(data as unknown as DbRequest);
      },
      async setStatus(id: string, status: RequestStatus, fulfilledBy?: string) {
        const { data, error } = await getSupabase().rpc('set_request_status', {
          p_id: id, p_status: status, p_fulfilled_by: fulfilledBy ?? null,
        });
        if (error) throw error;
        return mapRequest(data as unknown as DbRequest);
      },
    },

    threads: {
      async mine(): Promise<ThreadSummary[]> {
        const { data, error } = await getSupabase()
          .from('threads')
          .select('id, context, context_id, title, last_message_at, thread_participants!inner(profile_id)')
          .order('last_message_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row) => {
          const r = row as unknown as {
            id: string; context: ThreadContext; context_id: string | null; title: string | null; last_message_at: string;
          };
          return {
            id: r.id, context: r.context, contextId: r.context_id, title: r.title,
            otherName: r.title ?? 'Conversation', lastMessageAt: r.last_message_at, unread: false,
          };
        });
      },
      async get(id: string) {
        const sb = getSupabase();
        const { data: t, error: te } = await sb
          .from('threads').select('id, context, context_id, title, last_message_at').eq('id', id).maybeSingle();
        if (te) throw te;
        if (!t) return null;
        const tr = t as { id: string; context: ThreadContext; context_id: string | null; title: string | null; last_message_at: string };
        const { data: msgs, error: me } = await sb
          .from('messages')
          .select('id, thread_id, sender_id, body, created_at, profiles(display_name)')
          .eq('thread_id', id).order('created_at', { ascending: true });
        if (me) throw me;
        const messages: Message[] = (msgs ?? []).map((row) => {
          const m = row as unknown as { id: string; thread_id: string; sender_id: string; body: string | null; created_at: string; profiles?: { display_name: string } | null };
          return { id: m.id, threadId: m.thread_id, senderId: m.sender_id, senderName: m.profiles?.display_name ?? '', body: m.body, createdAt: m.created_at };
        });
        return {
          thread: { id: tr.id, context: tr.context, contextId: tr.context_id, title: tr.title, otherName: tr.title ?? 'Conversation', lastMessageAt: tr.last_message_at, unread: false },
          messages,
        };
      },
      async open(context: ThreadContext, contextId, recipient, firstMessage) {
        const { data, error } = await getSupabase().rpc('open_thread', {
          p_context: context, p_context_id: contextId, p_recipient: recipient, p_first_message: firstMessage,
        });
        if (error) throw error;
        return (data as { id: string }).id;
      },
      async send(threadId: string, body: string) {
        const sb = getSupabase();
        const { data: auth } = await sb.auth.getUser();
        const { data, error } = await sb
          .from('messages').insert({ thread_id: threadId, sender_id: auth.user?.id, body }).select('*').single();
        if (error) throw error;
        const m = data as { id: string; thread_id: string; sender_id: string; body: string | null; created_at: string };
        return { id: m.id, threadId: m.thread_id, senderId: m.sender_id, senderName: '', body: m.body, createdAt: m.created_at };
      },
      async markRead(threadId: string) {
        const sb = getSupabase();
        const { data: auth } = await sb.auth.getUser();
        if (!auth.user) return;
        await sb.from('thread_participants').update({ last_read_at: new Date().toISOString() })
          .eq('thread_id', threadId).eq('profile_id', auth.user.id);
      },
    },

    notifications: {
      async mine(): Promise<NotificationItem[]> {
        const { data, error } = await getSupabase()
          .from('notifications').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row) => {
          const n = row as { id: string; category: string; title: string; body: string | null; deep_link: string | null; read_at: string | null; created_at: string };
          return { id: n.id, category: n.category, title: n.title, body: n.body, deepLink: n.deep_link, readAt: n.read_at, createdAt: n.created_at };
        });
      },
      async markAllRead() {
        const sb = getSupabase();
        const { data: auth } = await sb.auth.getUser();
        if (!auth.user) return;
        await sb.from('notifications').update({ read_at: new Date().toISOString() })
          .eq('profile_id', auth.user.id).is('read_at', null);
      },
      async enablePush() {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
        const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapid) return false;
        if ((await Notification.requestPermission()) !== 'granted') return false;
        let reg: ServiceWorkerRegistration;
        try {
          reg = await navigator.serviceWorker.ready; // registered by virtual:pwa-register on load
        } catch {
          return false;
        }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) as unknown as BufferSource });
        const json = sub.toJSON();
        const sb = getSupabase();
        const { data: auth } = await sb.auth.getUser();
        if (!auth.user || !json.endpoint) return false;
        const { error } = await sb.from('push_subscriptions').upsert(
          { profile_id: auth.user.id, endpoint: json.endpoint, keys: json.keys, user_agent: navigator.userAgent },
          { onConflict: 'endpoint' },
        );
        return !error;
      },
    },

    events: {
      async list(communityId: string) {
        const sb = getSupabase();
        const { data: evs, error } = await sb.from('events').select(EV_SEL).eq('community_id', communityId).order('starts_at');
        if (error) throw error;
        const ids = (evs ?? []).map((e) => (e as { id: string }).id);
        let rsvps: DbRsvp[] = [];
        if (ids.length) {
          const { data } = await sb.from('event_rsvps').select('event_id,profile_id,status,party_size').in('event_id', ids);
          rsvps = (data ?? []) as DbRsvp[];
        }
        const { data: auth } = await sb.auth.getUser();
        return (evs ?? []).map((e) => mapEvent(e as unknown as DbEvent, rsvps, auth.user?.id));
      },
      async get(id: string) {
        const sb = getSupabase();
        const { data, error } = await sb.from('events').select(EV_SEL).eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        const { data: rsvps } = await sb.from('event_rsvps').select('event_id,profile_id,status,party_size').eq('event_id', id);
        const { data: auth } = await sb.auth.getUser();
        return mapEvent(data as unknown as DbEvent, (rsvps ?? []) as DbRsvp[], auth.user?.id);
      },
      async create(communityId: string, input: EventInput) {
        const p = eventSchema.parse(input);
        const sb = getSupabase();
        const { data, error } = await sb.from('events').insert({
          community_id: communityId, title: p.title, description: p.description ?? null, category: p.category,
          starts_at: p.startsAt, ends_at: p.endsAt ?? null, location_text: p.locationText ?? null,
          rsvp_mode: p.rsvpMode, capacity: p.capacity ?? null,
        }).select(EV_SEL).single();
        if (error) throw error;
        const { data: auth } = await sb.auth.getUser();
        return mapEvent(data as unknown as DbEvent, [], auth.user?.id);
      },
      async rsvp(eventId: string, status: RsvpStatus, partySize = 1) {
        const { error } = await getSupabase().rpc('set_rsvp', { p_event_id: eventId, p_status: status, p_party_size: partySize });
        if (error) throw error;
      },
    },

    alerts: {
      async list(communityId: string) {
        const { data, error } = await getSupabase().from('alerts').select('*').eq('community_id', communityId).is('resolved_at', null).order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map((r) => mapAlert(r as DbAlert));
      },
      async post(communityId: string, input: AlertInput) {
        const p = alertSchema.parse(input);
        const { data, error } = await getSupabase().rpc('post_alert', {
          p_community: communityId, p_tier: p.tier, p_category: p.category, p_title: p.title,
          p_body: p.body ?? null, p_as_org: p.asOrganisationId ?? null,
        });
        if (error) throw error;
        return mapAlert(data as DbAlert);
      },
      async resolve(id: string) {
        const { error } = await getSupabase().rpc('resolve_alert', { p_id: id });
        if (error) throw error;
      },
    },

    search: {
      async search(communityId: string, query: string) {
        if (!query.trim()) return [];
        const { data, error } = await getSupabase().rpc('global_search', {
          p_community: communityId,
          p_query: query,
          p_kinds: null,
        });
        if (error) throw error;
        return ((data ?? []) as unknown[]).map((row) => {
          const r = row as { kind: SearchResult['kind']; id: string; title: string; snippet: string };
          return { kind: r.kind, id: r.id, title: r.title, snippet: r.snippet };
        });
      },
    },

    moderation: {
      async report(input) {
        const p = reportSchema.parse(input);
        const { error } = await getSupabase().rpc('report_target', {
          p_kind: p.targetKind, p_id: p.targetId, p_reason: p.reason, p_note: p.note ?? null,
        });
        if (error) throw error;
      },
      async reports(communityId): Promise<Report[]> {
        const { data, error } = await getSupabase().rpc('admin_reports', { p_cid: communityId });
        if (error) throw error;
        return ((data ?? []) as DbAdminReport[]).map((r) => ({
          id: r.id, communityId: r.community_id, reporterId: r.reporter_id, reporterName: r.reporter_name,
          targetKind: r.target_kind as ModerationTargetKind, targetId: r.target_id, targetLabel: r.target_label,
          reason: r.reason as Report['reason'], note: r.note, priority: r.priority, status: r.status as Report['status'],
          reportCount: Number(r.report_count), createdAt: r.created_at,
        }));
      },
      async decide(reportId, uphold) {
        const { error } = await getSupabase().rpc('decide_report', { p_report_id: reportId, p_uphold: uphold });
        if (error) throw error;
      },
      async moderate(action, targetKind, targetId, detail = {}) {
        const { error } = await getSupabase().rpc('admin_moderate', {
          p_action: action, p_kind: targetKind, p_id: targetId, p_detail: detail,
        });
        if (error) throw error;
      },
      async log(communityId): Promise<ModerationLogEntry[]> {
        const { data, error } = await getSupabase().rpc('admin_moderation_log', { p_cid: communityId });
        if (error) throw error;
        return ((data ?? []) as DbAdminLog[]).map((a) => ({
          id: a.id, communityId: a.community_id, actorId: a.actor_id, actorName: a.actor_name,
          targetKind: a.target_kind, targetId: a.target_id, action: a.action as ModerationAction,
          detail: a.detail ?? {}, createdAt: a.created_at,
        }));
      },
      async hidden(communityId): Promise<HiddenItem[]> {
        const { data, error } = await getSupabase().rpc('admin_hidden', { p_cid: communityId });
        if (error) throw error;
        return ((data ?? []) as DbHidden[]).map((h) => ({
          kind: h.kind as ModerationTargetKind, id: h.id, title: h.title, reason: h.reason, hiddenAt: h.hidden_at,
        }));
      },
      async delays(communityId): Promise<FirstPostDelay[]> {
        const { data, error } = await getSupabase().rpc('admin_delays', { p_cid: communityId });
        if (error) throw error;
        return ((data ?? []) as DbDelay[]).map((d) => ({
          id: d.id, profileId: d.profile_id, profileName: d.profile_name, contentKind: d.content_kind,
          contentId: d.content_id, releaseAt: d.release_at, releasedAt: d.released_at,
        }));
      },
      async releaseDelay(delayId) {
        const { error } = await getSupabase().rpc('release_delay', { p_id: delayId });
        if (error) throw error;
      },
      async members(communityId): Promise<AdminMember[]> {
        const { data, error } = await getSupabase().rpc('admin_members', { p_cid: communityId });
        if (error) throw error;
        return ((data ?? []) as DbAdminMember[]).map((m) => ({
          profileId: m.profile_id, displayName: m.display_name, avatarUrl: m.avatar_url,
          trustLevel: m.trust_level as TrustLevel, status: m.status as AdminMember['status'],
          suspendedUntil: m.suspended_until, joinedAt: m.joined_at, upheldReports: Number(m.upheld_reports),
        }));
      },
      async dashboard(communityId): Promise<AdminDashboard> {
        const { data, error } = await getSupabase().rpc('admin_dashboard', { p_cid: communityId });
        if (error) throw error;
        const d = (data ?? {}) as Partial<AdminDashboard>;
        return {
          openReports: d.openReports ?? 0, priorityReports: d.priorityReports ?? 0, hiddenItems: d.hiddenItems ?? 0,
          pendingClaims: d.pendingClaims ?? 0, delayedPosts: d.delayedPosts ?? 0,
          newMembersToday: d.newMembersToday ?? 0, activeAlerts: d.activeAlerts ?? 0,
        };
      },
      async config(communityId, patch): Promise<Community> {
        const { data, error } = await getSupabase().rpc('admin_set_config', {
          p_cid: communityId, p_config: patch as Record<string, unknown>,
        });
        if (error) throw error;
        return mapCommunity(data as DbCommunity);
      },
      async triage(reportId): Promise<TriageSuggestion> {
        const rows = await getSupabase().from('reports').select('reason,note').eq('id', reportId).maybeSingle();
        const r = rows.data as { reason: string; note: string | null } | null;
        return triageReport({ reason: r?.reason ?? 'other', note: r?.note ?? null });
      },
    },

    account: {
      async export(): Promise<Record<string, unknown>> {
        const { data, error } = await getSupabase().rpc('export_account');
        if (error) throw error;
        return (data ?? {}) as Record<string, unknown>;
      },
      async delete() {
        const sb = getSupabase();
        const { error } = await sb.rpc('delete_account');
        if (error) throw error;
        await sb.auth.signOut();
      },
    },
  };
}

interface DbAdminReport {
  id: string; community_id: string; reporter_id: string; reporter_name: string; target_kind: string;
  target_id: string; target_label: string | null; reason: string; note: string | null; priority: boolean;
  status: string; report_count: number | string; created_at: string;
}
interface DbAdminLog {
  id: string; community_id: string; actor_id: string | null; actor_name: string; target_kind: string;
  target_id: string; action: string; detail: Record<string, unknown> | null; created_at: string;
}
interface DbHidden { kind: string; id: string; title: string; reason: string | null; hidden_at: string }
interface DbDelay {
  id: string; profile_id: string; profile_name: string; content_kind: string; content_id: string;
  release_at: string; released_at: string | null;
}
interface DbAdminMember {
  profile_id: string; display_name: string; avatar_url: string | null; trust_level: number; status: string;
  suspended_until: string | null; joined_at: string; upheld_reports: number | string;
}
