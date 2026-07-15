// Mock Services — the no-DB implementation. Mirrors the RPC/RLS behaviour so screens behave
// as they will against Postgres. Every mutation persists to localStorage.
import {
  alertSchema,
  equipmentSchema,
  eventSchema,
  joinSchema,
  listingSchema,
  reportSchema,
  requestSchema,
  serviceSchema,
  signUpSchema,
  type AlertInput,
  type EquipmentInput,
  type EventInput,
  type JoinInput,
  type ListingInput,
  type ProfilePatch,
  type RequestInput,
  type ServiceInput,
  type Services,
  type SignUpInput,
} from '../contracts';
import type {
  Alert,
  Community,
  CommunityCard,
  EquipmentItem,
  Event,
  Identity,
  Invite,
  Listing,
  ListingStatus,
  MemberSummary,
  Membership,
  MembershipSummary,
  Message,
  NotificationItem,
  OrganisationKind,
  PlaceKind,
  Profile,
  RequestPost,
  RequestStatus,
  RsvpStatus,
  SearchResult,
  Service,
  Session,
  Skill,
  ThreadContext,
  ThreadSummary,
  TrustLevel,
} from '../types';
import { horsmondenDrafts } from '@/lib/ingest/horsmondenFixture';
import { triageReport } from '@/lib/moderation/triage';
import {
  db,
  getCurrentProfileId,
  persist,
  postcodeDistrict,
  setCurrentProfileId,
  uid,
  type MockEvent,
} from './db';

function nowIso(): string {
  return new Date().toISOString();
}

function summarise(profileId: string): MembershipSummary[] {
  const d = db();
  return d.memberships
    .filter((m) => m.profileId === profileId && m.status === 'active')
    .map((m) => {
      const c = d.communities.find((x) => x.id === m.communityId)!;
      return {
        communityId: c.id,
        slug: c.slug,
        name: c.name,
        skin: c.skin,
        trustLevel: m.trustLevel,
        status: c.status,
      };
    });
}

function buildSession(profileId: string): Session | null {
  const d = db();
  const profile = d.profiles.find((p) => p.id === profileId);
  if (!profile) return null;
  const memberships = summarise(profileId);
  return {
    profileId,
    profile,
    memberships,
    activeCommunityId: memberships[0]?.communityId ?? null,
  };
}

function requireProfileId(): string {
  const id = getCurrentProfileId();
  if (!id) throw new Error('Not signed in');
  return id;
}

function inviteCode(): string {
  return Array.from({ length: 6 }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charAt(Math.floor(Math.random() * 32)),
  ).join('');
}

function toCard(c: Community): CommunityCard {
  return { id: c.id, slug: c.slug, name: c.name, type: c.type, region: c.region, status: c.status };
}

function profileName(id: string): string {
  return db().profiles.find((p) => p.id === id)?.displayName ?? 'Someone';
}

function trustInMock(profileId: string, communityId: string): number {
  const m = db().memberships.find(
    (x) => x.profileId === profileId && x.communityId === communityId && x.status === 'active',
  );
  return m ? m.trustLevel : -1;
}

function isMockAdmin(profileId: string): boolean {
  return db().profiles.find((p) => p.id === profileId)?.platformRole === 'admin';
}

function isMockSuspended(profileId: string, communityId: string): boolean {
  const m = db().memberships.find((x) => x.profileId === profileId && x.communityId === communityId);
  return Boolean(m && ((m.suspendedUntil && m.suspendedUntil > nowIso()) || m.status === 'suspended'));
}

/** Auto-hide/hidden filter (mirrors RLS): hidden items are visible only to the author + admins.
 * Applied to listings + requests in the mock — the primary content the review flows exercise;
 * the live DB enforces this across every kind via RLS (proven in verify-m7). */
function visibleToViewer(kind: string, item: { id: string; createdBy?: string }): boolean {
  const d = db();
  const hidden = d.hidden.some((h) => h.kind === kind && h.id === item.id);
  if (!hidden) return true;
  const viewer = getCurrentProfileId();
  if (!viewer) return false;
  return item.createdBy === viewer || isMockAdmin(viewer);
}

/** Record an auto-hide when open reports on a target reach the community threshold. */
function maybeAutoHide(communityId: string, targetKind: string, targetId: string, reporterId: string): void {
  const d = db();
  const community = d.communities.find((c) => c.id === communityId);
  let threshold = targetKind === 'message' ? 2 : community?.config.autoHideReportThreshold ?? 3;
  if (isMockAdmin(reporterId) || trustInMock(reporterId, communityId) >= 3) threshold = 1;
  const open = d.reports.filter((r) => r.targetKind === targetKind && r.targetId === targetId && r.status === 'open').length;
  if (open < threshold) return;
  if (!d.hidden.some((h) => h.kind === targetKind && h.id === targetId)) {
    d.hidden.push({ kind: targetKind, id: targetId, reason: 'auto-hidden after reports', hiddenAt: nowIso() });
    d.moderationActions.push({
      id: uid(), communityId, actorId: null, targetKind, targetId,
      action: 'autoHide', detail: { reports: open }, createdAt: nowIso(),
    });
  }
}

/** Mirrors the on_message_insert trigger: bump the thread + fan out notifications. */
function fanOutMessage(threadId: string, senderId: string, body: string): void {
  const d = db();
  const th = d.threads.find((t) => t.id === threadId);
  if (!th) return;
  th.lastMessageAt = nowIso();
  for (const p of d.participants) {
    if (p.threadId === threadId && p.profileId !== senderId && p.leftAt === null) {
      d.notifications.push({
        id: uid(),
        profileId: p.profileId,
        category: 'message',
        title: th.title ?? 'New message',
        body: body.slice(0, 140),
        deepLink: `/inbox/t/${threadId}`,
        readAt: null,
        createdAt: nowIso(),
      });
    }
  }
}

function toEvent(e: MockEvent): Event {
  const d = db();
  const goingCount = d.eventRsvps.filter((x) => x.eventId === e.id && x.status === 'going').reduce((s, x) => s + x.partySize, 0);
  const me = getCurrentProfileId();
  const myRsvp = me ? (d.eventRsvps.find((x) => x.eventId === e.id && x.profileId === me)?.status ?? null) : null;
  return { ...e, photos: (e as { photos?: string[] }).photos ?? [], goingCount, myRsvp };
}

/** Mirrors promote_waitlist: fill freed capacity from the waitlist, oldest first. */
function promoteWaitlistMock(eventId: string): void {
  const d = db();
  const e = d.events.find((x) => x.id === eventId);
  if (!e) return;
  let used = d.eventRsvps.filter((x) => x.eventId === eventId && x.status === 'going').reduce((s, x) => s + x.partySize, 0);
  const wl = d.eventRsvps.filter((x) => x.eventId === eventId && x.status === 'waitlist').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const r of wl) {
    if (used + r.partySize <= (e.capacity ?? 0)) {
      r.status = 'going';
      used += r.partySize;
      d.notifications.push({ id: uid(), profileId: r.profileId, category: 'event.reminder', title: 'A spot opened up', body: e.title, deepLink: `/events/${eventId}`, readAt: null, createdAt: nowIso() });
    }
  }
}

export function createMockServices(): Services {
  return {
    isMock: true,

    auth: {
      async currentSession() {
        const id = getCurrentProfileId();
        return id ? buildSession(id) : null;
      },

      async signUp(input: SignUpInput) {
        const parsed = signUpSchema.parse(input);
        const d = db();
        if (d.auth.some((a) => a.email.toLowerCase() === parsed.email.toLowerCase())) {
          throw new Error('An account with that email already exists');
        }
        const id = uid();
        d.auth.push({ id, email: parsed.email, password: parsed.password });
        const profile: Profile = {
          id,
          displayName: parsed.displayName,
          email: parsed.email,
          avatarUrl: null,
          bio: null,
          dateOfBirth: parsed.dateOfBirth,
          platformRole: null,
          dmPrivacy: 'members',
          peopleDirectoryOptIn: true,
          createdAt: nowIso(),
        };
        d.profiles.push(profile);
        persist();
        setCurrentProfileId(id);
        return buildSession(id)!;
      },

      async signIn(email: string, password: string) {
        const d = db();
        const row = d.auth.find((a) => a.email.toLowerCase() === email.toLowerCase());
        if (!row || row.password !== password) throw new Error('Email or password is incorrect');
        setCurrentProfileId(row.id);
        return buildSession(row.id)!;
      },

      async signOut() {
        setCurrentProfileId(null);
      },
    },

    communities: {
      async discover(postcode: string) {
        const district = postcodeDistrict(postcode);
        return db()
          .communities.filter(
            (c) =>
              (c.status === 'seeding' || c.status === 'launched') &&
              c.postcodeDistricts.map((x) => x.toUpperCase()).includes(district),
          )
          .map(toCard);
      },

      async getBySlug(slug: string) {
        return db().communities.find((c) => c.slug === slug) ?? null;
      },

      async join(input: JoinInput) {
        const parsed = joinSchema.parse(input);
        const profileId = requireProfileId();
        const d = db();
        const c = d.communities.find((x) => x.slug === parsed.slug);
        if (!c) throw new Error('community not found');
        if (c.status === 'archived') throw new Error('community is archived');
        if (d.memberships.some((m) => m.profileId === profileId && m.communityId === c.id)) {
          throw new Error('already a member of this community');
        }

        let trustLevel: TrustLevel = 0;
        let joinedVia: Membership['joinedVia'] = 'postcode';

        if (parsed.inviteCode) {
          const inv = d.invites.find((i) => i.code === parsed.inviteCode && i.communityId === c.id);
          if (!inv) throw new Error('invalid invite code');
          if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) throw new Error('invite has expired');
          if (inv.uses >= inv.maxUses) throw new Error('invite has no uses left');
          inv.uses += 1;
          trustLevel = 1;
          joinedVia = 'invite';
        } else {
          const district = postcodeDistrict(parsed.postcode!);
          if (!c.postcodeDistricts.map((x) => x.toUpperCase()).includes(district)) {
            throw new Error('that postcode is not in this community');
          }
        }

        const membership: Membership = {
          id: uid(),
          profileId,
          communityId: c.id,
          trustLevel,
          joinedVia,
          identities: [],
          status: 'active',
          suspendedUntil: null,
          createdAt: nowIso(),
        };
        d.memberships.push(membership);
        persist();
        return membership;
      },
    },

    profiles: {
      async update(patch: ProfilePatch) {
        const profileId = requireProfileId();
        const d = db();
        const profile = d.profiles.find((p) => p.id === profileId);
        if (!profile) throw new Error('Not signed in');
        Object.assign(profile, patch);
        persist();
        return profile;
      },
    },

    memberships: {
      async membersOf(communityId: string): Promise<MemberSummary[]> {
        const d = db();
        return d.memberships
          .filter((m) => m.communityId === communityId && m.status === 'active')
          .map((m) => {
            const p = d.profiles.find((x) => x.id === m.profileId)!;
            return {
              profileId: m.profileId,
              displayName: p?.displayName ?? 'Member',
              avatarUrl: p?.avatarUrl ?? null,
              trustLevel: m.trustLevel,
              identities: m.identities,
              joinedAt: m.createdAt,
            };
          });
      },

      async updateIdentities(communityId: string, identities: Identity[]) {
        const profileId = requireProfileId();
        const d = db();
        const m = d.memberships.find(
          (x) => x.profileId === profileId && x.communityId === communityId,
        );
        if (!m) throw new Error('not a member of this community');
        m.identities = identities;
        persist();
        return m;
      },
    },

    invites: {
      async create(communityId: string): Promise<Invite> {
        const profileId = requireProfileId();
        const d = db();
        const m = d.memberships.find(
          (x) => x.profileId === profileId && x.communityId === communityId,
        );
        if (!m || m.trustLevel < 1) throw new Error('you need trust level 1 to invite');
        const invite: Invite = {
          code: inviteCode(),
          communityId,
          createdBy: profileId,
          maxUses: 10,
          uses: 0,
          expiresAt: null,
          createdAt: nowIso(),
        };
        d.invites.push(invite);
        persist();
        return invite;
      },
      async mine(communityId: string): Promise<Invite[]> {
        const profileId = requireProfileId();
        return db().invites.filter((i) => i.createdBy === profileId && i.communityId === communityId);
      },
    },

    vouches: {
      async vouchFor(profileId: string, communityId: string) {
        const voucher = requireProfileId();
        const d = db();
        const mine = d.memberships.find(
          (x) => x.profileId === voucher && x.communityId === communityId,
        );
        if (!mine || mine.trustLevel < 2) throw new Error('you need trust level 2 to vouch');
        if (profileId === voucher) throw new Error('you cannot vouch for yourself');
        const target = d.memberships.find(
          (x) => x.profileId === profileId && x.communityId === communityId,
        );
        if (!target) throw new Error('that person is not a member of this community');
        if (!d.vouches.some((v) => v.voucherId === voucher && v.vouchedId === profileId && v.communityId === communityId)) {
          d.vouches.push({ voucherId: voucher, vouchedId: profileId, communityId });
        }
        const count = d.vouches.filter((v) => v.vouchedId === profileId && v.communityId === communityId).length;
        target.trustLevel = Math.max(target.trustLevel, count >= 2 ? 2 : 1) as TrustLevel;
        persist();
      },
    },

    directory: {
      async places(communityId) {
        return db().places.filter((p) => p.communityId === communityId);
      },
      async businesses(communityId) {
        return db().businesses.filter((b) => b.communityId === communityId);
      },
      async organisations(communityId) {
        return db().organisations.filter((o) => o.communityId === communityId);
      },
      async noticeboard() {
        return []; // org posts are not modelled in the mock; live noticeboard uses Supabase.
      },
      async business(id) {
        return db().businesses.find((b) => b.id === id) ?? null;
      },
      async place(id) {
        return db().places.find((p) => p.id === id) ?? null;
      },
      async organisation(id) {
        return db().organisations.find((o) => o.id === id) ?? null;
      },
      async services(communityId) {
        return db().services.filter((s) => s.communityId === communityId && s.active);
      },
      async skills(communityId) {
        return db().skills.filter((s) => s.communityId === communityId);
      },
      async equipment(communityId) {
        return db().equipment.filter((e) => e.communityId === communityId);
      },
      async equipmentItem(id) {
        return db().equipment.find((e) => e.id === id) ?? null;
      },
      async addService(communityId, input: ServiceInput) {
        const parsed = serviceSchema.parse(input);
        const profileId = requireProfileId();
        if (trustInMock(profileId, communityId) < 1) throw new Error('you need trust level 1 to add a service');
        const s: Service = {
          id: uid(),
          communityId,
          createdBy: profileId,
          authorName: profileName(profileId),
          title: parsed.title,
          category: parsed.category,
          description: parsed.description ?? null,
          active: true,
        };
        db().services.push(s);
        persist();
        return s;
      },
      async addSkill(communityId, skill: string, note?: string) {
        const profileId = requireProfileId();
        if (trustInMock(profileId, communityId) < 1) throw new Error('you need trust level 1 to add a skill');
        const s: Skill = {
          id: uid(),
          communityId,
          profileId,
          personName: profileName(profileId),
          skill,
          note: note ?? null,
        };
        db().skills.push(s);
        persist();
        return s;
      },
      async addEquipment(communityId, input: EquipmentInput) {
        const parsed = equipmentSchema.parse(input);
        const profileId = requireProfileId();
        if (trustInMock(profileId, communityId) < 1) throw new Error('you need trust level 1 to add equipment');
        const e: EquipmentItem = {
          id: uid(),
          communityId,
          ownerProfileId: profileId,
          ownerName: profileName(profileId),
          name: parsed.name,
          category: parsed.category,
          note: parsed.note ?? null,
          lendTerms: parsed.lendTerms ?? null,
          photos: parsed.photos ?? [],
          available: true,
        };
        db().equipment.push(e);
        persist();
        return e;
      },
    },

    claims: {
      async claim(businessId, _evidence, _linkToken) {
        const profileId = requireProfileId();
        const d = db();
        const b = d.businesses.find((x) => x.id === businessId);
        if (!b) throw new Error('business not found');
        if (b.ownerProfileId) throw new Error('this page is already claimed');
        // Demo: no admin exists in the mock, so a claim auto-approves. The real path is
        // claim_business -> admin decide_claim (or link auto-approve).
        b.ownerProfileId = profileId;
        b.claimedAt = nowIso();
        b.source = 'self';
        persist();
      },
    },

    seeding: {
      async proposals(communityId) {
        return db().seedProposals.filter((p) => p.communityId === communityId);
      },
      async runFixtureIngestion(communityId) {
        const d = db();
        const drafts = horsmondenDrafts();
        for (const draft of drafts) {
          d.seedProposals.push({
            id: uid(),
            communityId,
            kind: draft.kind,
            source: draft.source,
            payload: draft.payload,
            status: 'pending',
            createdAt: nowIso(),
          });
        }
        persist();
        return drafts.length;
      },
      async decide(proposalId, accept) {
        const d = db();
        const p = d.seedProposals.find((x) => x.id === proposalId);
        if (!p) throw new Error('proposal not found');
        if (p.status !== 'pending') throw new Error('proposal already decided');
        const pay = p.payload;
        const str = (k: string): string | null => (pay[k] != null ? String(pay[k]) : null);
        if (accept) {
          if (p.kind === 'place') {
            d.places.push({
              id: uid(),
              communityId: p.communityId,
              name: String(pay.name),
              kind: (str('kind') as PlaceKind) ?? 'other',
              description: str('description'),
              address: str('address'),
              photos: [],
              businessId: null,
              organisationId: null,
              source: 'seed',
            });
          } else if (p.kind === 'business') {
            d.businesses.push({
              id: uid(),
              communityId: p.communityId,
              ownerProfileId: null,
              name: String(pay.name),
              categories: Array.isArray(pay.categories) ? (pay.categories as string[]) : [],
              description: str('description'),
              contact: {},
              photos: [],
              isHomeBusiness: false,
              servesAdjacent: true,
              source: 'seed',
              claimedAt: null,
              verifiedAt: null,
            });
          } else if (p.kind === 'organisation') {
            d.organisations.push({
              id: uid(),
              communityId: p.communityId,
              name: String(pay.name),
              kind: (str('kind') as OrganisationKind) ?? 'group',
              description: str('description'),
              verifiedSource: Boolean(pay.verified_source),
              source: 'seed',
            });
          }
          p.status = 'accepted';
        } else {
          p.status = 'rejected';
        }
        persist();
      },
      async launch(communityId) {
        const c = db().communities.find((x) => x.id === communityId);
        if (c) c.status = 'launched';
        persist();
      },
    },

    listings: {
      async list(communityId) {
        return db()
          .listings.filter((l) => l.communityId === communityId && l.status !== 'withdrawn')
          .filter((l) => visibleToViewer('listing', l))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async get(id) {
        const l = db().listings.find((x) => x.id === id) ?? null;
        if (!l || !visibleToViewer('listing', l)) return null;
        return { ...l, condition: l.condition ?? null, photos: l.photos ?? [], hidden: db().hidden.some((h) => h.kind === 'listing' && h.id === l.id) };
      },
      async create(communityId, input: ListingInput) {
        const parsed = listingSchema.parse(input);
        const profileId = requireProfileId();
        if (isMockSuspended(profileId, communityId)) throw new Error('your posting is paused while your account is under review');
        const d = db();
        const community = d.communities.find((c) => c.id === communityId);
        const cap = community?.config.listingCapT0 ?? 2;
        if (trustInMock(profileId, communityId) < 1) {
          const active = d.listings.filter(
            (l) => l.createdBy === profileId && l.communityId === communityId && l.status === 'active',
          ).length;
          if (active >= cap) {
            throw new Error(`New neighbours can have up to ${cap} active listings. Yours will unlock more as you settle in.`);
          }
        }
        const listing: Listing = {
          id: uid(),
          communityId,
          createdBy: profileId,
          authorName: profileName(profileId),
          kind: parsed.kind,
          title: parsed.title,
          description: parsed.description ?? null,
          category: parsed.category,
          pricePence: parsed.pricePence ?? null,
          status: 'active',
          condition: parsed.condition ?? null,
          photos: parsed.photos ?? [],
          createdAt: nowIso(),
        };
        d.listings.push(listing);
        persist();
        return listing;
      },
      async setStatus(id, status: ListingStatus) {
        const d = db();
        const l = d.listings.find((x) => x.id === id);
        if (!l) throw new Error('listing not found');
        if (l.createdBy !== requireProfileId()) throw new Error('not your listing');
        if (['completed', 'expired', 'withdrawn'].includes(l.status)) throw new Error('this listing is closed');
        l.status = status;
        persist();
        return l;
      },
    },

    requests: {
      async list(communityId) {
        return db()
          .requests.filter((r) => r.communityId === communityId && r.status !== 'withdrawn')
          .filter((r) => visibleToViewer('request', r))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async get(id) {
        const r = db().requests.find((x) => x.id === id) ?? null;
        if (!r || !visibleToViewer('request', r)) return null;
        return { ...r, hidden: db().hidden.some((h) => h.kind === 'request' && h.id === r.id) };
      },
      async create(communityId, input: RequestInput) {
        const parsed = requestSchema.parse(input);
        const profileId = requireProfileId();
        if (isMockSuspended(profileId, communityId)) throw new Error('your posting is paused while your account is under review');
        const d = db();
        const community = d.communities.find((c) => c.id === communityId);
        const cap = community?.config.requestCapT0 ?? 1;
        if (trustInMock(profileId, communityId) < 1) {
          const open = d.requests.filter(
            (r) => r.createdBy === profileId && r.communityId === communityId && r.status === 'open',
          ).length;
          if (open >= cap) {
            throw new Error(`New neighbours can have ${cap} open request at a time. Close one to post another.`);
          }
        }
        const request: RequestPost = {
          id: uid(),
          communityId,
          createdBy: profileId,
          authorName: profileName(profileId),
          title: parsed.title,
          description: parsed.description ?? null,
          category: parsed.category,
          status: 'open',
          neededBy: parsed.neededBy ?? null,
          createdAt: nowIso(),
        };
        d.requests.push(request);
        persist();
        return request;
      },
      async setStatus(id, status: RequestStatus, fulfilledBy?: string) {
        const d = db();
        const r = d.requests.find((x) => x.id === id);
        if (!r) throw new Error('request not found');
        if (r.createdBy !== requireProfileId()) throw new Error('not your request');
        if (['fulfilled', 'expired', 'withdrawn'].includes(r.status)) throw new Error('this request is closed');
        r.status = status;
        if (status === 'fulfilled' && fulfilledBy) r.fulfilledBy = fulfilledBy;
        persist();
        return r;
      },
    },

    threads: {
      async mine(): Promise<ThreadSummary[]> {
        const me = requireProfileId();
        const d = db();
        const myThreadIds = d.participants
          .filter((p) => p.profileId === me && p.leftAt === null)
          .map((p) => p.threadId);
        return d.threads
          .filter((t) => myThreadIds.includes(t.id))
          .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
          .map((t) => {
            const otherP = d.participants.find((p) => p.threadId === t.id && p.profileId !== me);
            const mine = d.participants.find((p) => p.threadId === t.id && p.profileId === me);
            const unread = d.messages.some(
              (m) => m.threadId === t.id && m.senderId !== me && (!mine || m.createdAt > mine.lastReadAt),
            );
            return {
              id: t.id,
              context: t.context,
              contextId: t.contextId,
              title: t.title,
              otherName: otherP ? profileName(otherP.profileId) : 'Community',
              lastMessageAt: t.lastMessageAt,
              unread,
            };
          });
      },
      async get(id) {
        const me = requireProfileId();
        const d = db();
        const t = d.threads.find((x) => x.id === id);
        if (!t) return null;
        if (!d.participants.some((p) => p.threadId === id && p.profileId === me)) return null;
        const otherP = d.participants.find((p) => p.threadId === id && p.profileId !== me);
        const thread: ThreadSummary = {
          id: t.id,
          context: t.context,
          contextId: t.contextId,
          title: t.title,
          otherName: otherP ? profileName(otherP.profileId) : 'Community',
          lastMessageAt: t.lastMessageAt,
          unread: false,
        };
        const messages: Message[] = d.messages
          .filter((m) => m.threadId === id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((m) => ({
            id: m.id,
            threadId: m.threadId,
            senderId: m.senderId,
            senderName: profileName(m.senderId),
            body: m.body,
            createdAt: m.createdAt,
          }));
        return { thread, messages };
      },
      async open(context: ThreadContext, contextId, recipient, firstMessage) {
        if (!firstMessage.trim()) throw new Error('a first message is required');
        const me = requireProfileId();
        const d = db();
        let cid: string | undefined;
        let other: string | null = null;
        let title: string | null = null;

        if (context === 'direct') {
          if (!recipient) throw new Error('recipient required');
          other = recipient;
          const mineCids = d.memberships.filter((m) => m.profileId === me && m.status === 'active').map((m) => m.communityId);
          cid = d.memberships.find((m) => m.profileId === recipient && m.status === 'active' && mineCids.includes(m.communityId))?.communityId;
          if (!cid) throw new Error('you have no community in common');
          const alreadyShare = d.participants.some(
            (p1) => p1.profileId === me && d.participants.some((p2) => p2.threadId === p1.threadId && p2.profileId === other),
          );
          if (!alreadyShare) {
            const community = d.communities.find((c) => c.id === cid);
            const dmMin = community?.config.coldDmMinTrust ?? 1;
            if (trustInMock(me, cid) < dmMin) throw new Error('you need more trust to message directly');
            const recip = d.profiles.find((p) => p.id === recipient);
            if (recip && (recip.dmPrivacy === 'nobody' || recip.dmPrivacy === 'contacts')) {
              throw new Error('this person is not accepting new messages');
            }
          }
        } else if (context === 'listing') {
          const l = d.listings.find((x) => x.id === contextId);
          if (!l) throw new Error('listing not found');
          cid = l.communityId; other = l.createdBy; title = l.title;
        } else if (context === 'request') {
          const r = d.requests.find((x) => x.id === contextId);
          if (!r) throw new Error('request not found');
          cid = r.communityId; other = r.createdBy; title = r.title;
        } else if (context === 'business') {
          const b = d.businesses.find((x) => x.id === contextId);
          if (!b) throw new Error('business not found');
          cid = b.communityId; other = b.ownerProfileId; title = b.name;
        } else {
          throw new Error('unsupported thread context');
        }

        // dedupe
        let existing: string | undefined;
        if (context === 'direct') {
          existing = d.threads.find(
            (t) => t.context === 'direct' &&
              d.participants.some((p) => p.threadId === t.id && p.profileId === me) &&
              d.participants.some((p) => p.threadId === t.id && p.profileId === other),
          )?.id;
        } else {
          existing = d.threads.find(
            (t) => t.context === context && t.contextId === contextId &&
              d.participants.some((p) => p.threadId === t.id && p.profileId === me),
          )?.id;
        }
        if (existing) {
          d.messages.push({ id: uid(), threadId: existing, senderId: me, body: firstMessage, createdAt: nowIso() });
          fanOutMessage(existing, me, firstMessage);
          persist();
          return existing;
        }

        const threadId = uid();
        d.threads.push({ id: threadId, communityId: cid, context, contextId: context === 'direct' ? null : contextId, title, createdBy: me, lastMessageAt: nowIso(), createdAt: nowIso() });
        d.participants.push({ threadId, profileId: me, lastReadAt: nowIso(), leftAt: null });
        if (other && other !== me) {
          d.participants.push({ threadId, profileId: other, lastReadAt: '1970-01-01T00:00:00.000Z', leftAt: null });
        }
        d.messages.push({ id: uid(), threadId, senderId: me, body: firstMessage, createdAt: nowIso() });
        // request first-response trigger
        if (context === 'request' && contextId) {
          const r = d.requests.find((x) => x.id === contextId);
          if (r && r.status === 'open') r.status = 'answered';
        }
        fanOutMessage(threadId, me, firstMessage);
        persist();
        return threadId;
      },
      async send(threadId, body) {
        if (!body.trim()) throw new Error('message is empty');
        const me = requireProfileId();
        const d = db();
        if (!d.participants.some((p) => p.threadId === threadId && p.profileId === me)) {
          throw new Error('not a participant');
        }
        const msg = { id: uid(), threadId, senderId: me, body, createdAt: nowIso() };
        d.messages.push(msg);
        fanOutMessage(threadId, me, body);
        persist();
        return { ...msg, senderName: profileName(me) };
      },
      async markRead(threadId) {
        const me = requireProfileId();
        const p = db().participants.find((x) => x.threadId === threadId && x.profileId === me);
        if (p) {
          p.lastReadAt = nowIso();
          persist();
        }
      },
    },

    notifications: {
      async mine(): Promise<NotificationItem[]> {
        const me = requireProfileId();
        return db()
          .notifications.filter((n) => n.profileId === me)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((n) => ({
            id: n.id,
            category: n.category,
            title: n.title,
            body: n.body,
            deepLink: n.deepLink,
            readAt: n.readAt,
            createdAt: n.createdAt,
          }));
      },
      async markAllRead() {
        const me = requireProfileId();
        const now = nowIso();
        for (const n of db().notifications) {
          if (n.profileId === me && n.readAt === null) n.readAt = now;
        }
        persist();
      },
      async enablePush() {
        // Web-push needs the deployed app + service worker; the mock cannot subscribe.
        return false;
      },
    },

    alerts: {
      async list(communityId) {
        const now = Date.now();
        return db()
          .alerts.filter((a) => a.communityId === communityId && a.resolvedAt === null && new Date(a.expiresAt).getTime() > now)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async post(communityId, input: AlertInput) {
        const parsed = alertSchema.parse(input);
        const profileId = requireProfileId();
        if (parsed.tier === 'community') {
          if (trustInMock(profileId, communityId) < 1) throw new Error('you need trust level 1 to post an alert');
        } else if (parsed.tier === 'verified') {
          throw new Error('verified alerts require a verified organisation');
        } else {
          throw new Error('platform alerts are for admins only');
        }
        const a: Alert = {
          id: uid(),
          communityId,
          createdBy: profileId,
          tier: parsed.tier,
          category: parsed.category,
          title: parsed.title,
          body: parsed.body ?? null,
          photos: parsed.photos ?? [],
          resolvedAt: null,
          expiresAt: new Date(Date.now() + 3 * 864e5).toISOString(),
          createdAt: nowIso(),
        };
        const d = db();
        d.alerts.push(a);
        // mock supports the community tier only, so the in-app fan-out key is alert.community
        const key = 'alert.community';
        for (const m of d.memberships.filter((x) => x.communityId === communityId && x.status === 'active' && x.profileId !== profileId)) {
          const p = d.profiles.find((pp) => pp.id === m.profileId);
          const on = p?.notificationPrefs?.[key] ?? true;
          if (on) d.notifications.push({ id: uid(), profileId: m.profileId, category: key, title: parsed.title, body: parsed.body ?? null, deepLink: '/', readAt: null, createdAt: nowIso() });
        }
        persist();
        return a;
      },
      async resolve(id) {
        const d = db();
        const a = d.alerts.find((x) => x.id === id);
        if (!a) throw new Error('alert not found');
        if (a.createdBy !== requireProfileId()) throw new Error('not your alert');
        a.resolvedAt = nowIso();
        persist();
      },
    },

    events: {
      async list(communityId) {
        return db()
          .events.filter((e) => e.communityId === communityId)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .map(toEvent);
      },
      async get(id) {
        const e = db().events.find((x) => x.id === id);
        return e ? toEvent(e) : null;
      },
      async create(communityId, input: EventInput) {
        const parsed = eventSchema.parse(input);
        const profileId = requireProfileId();
        if (trustInMock(profileId, communityId) < 1) throw new Error('you need trust level 1 to create an event');
        const e: MockEvent = {
          id: uid(),
          communityId,
          createdBy: profileId,
          authorName: profileName(profileId),
          title: parsed.title,
          description: parsed.description ?? null,
          category: parsed.category,
          locationText: parsed.locationText ?? null,
          startsAt: parsed.startsAt,
          endsAt: parsed.endsAt ?? null,
          rsvpMode: parsed.rsvpMode,
          capacity: parsed.capacity ?? null,
          photos: parsed.photos ?? [],
        };
        db().events.push(e);
        persist();
        return toEvent(e);
      },
      async rsvp(eventId, status: RsvpStatus, partySize = 1) {
        const profileId = requireProfileId();
        const d = db();
        const e = d.events.find((x) => x.id === eventId);
        if (!e) throw new Error('event not found');
        if (e.rsvpMode === 'none') throw new Error('this event does not take RSVPs');
        const size = Math.max(partySize, 1);
        let r = d.eventRsvps.find((x) => x.eventId === eventId && x.profileId === profileId);
        if (r) { r.status = status; r.partySize = size; }
        else { r = { eventId, profileId, status, partySize: size, createdAt: nowIso() }; d.eventRsvps.push(r); }
        if (e.rsvpMode === 'capacity' && status === 'going') {
          const going = d.eventRsvps.filter((x) => x.eventId === eventId && x.status === 'going' && x.profileId !== profileId).reduce((s, x) => s + x.partySize, 0);
          if (going + size > (e.capacity ?? 0)) r.status = 'waitlist';
        }
        if (e.rsvpMode === 'capacity' && (status === 'cancelled' || status === 'maybe' || status === 'waitlist')) {
          promoteWaitlistMock(eventId);
        }
        persist();
      },
    },

    search: {
      async search(communityId, query): Promise<SearchResult[]> {
        const term = query.trim().toLowerCase();
        if (!term) return [];
        const d = db();
        const hit = (t: string | null, de: string | null) =>
          (t ?? '').toLowerCase().includes(term) || (de ?? '').toLowerCase().includes(term);
        const out: SearchResult[] = [];
        d.businesses.filter((x) => x.communityId === communityId && hit(x.name, x.description)).forEach((x) => out.push({ kind: 'business', id: x.id, title: x.name, snippet: x.description ?? '' }));
        d.services.filter((x) => x.communityId === communityId && x.active && hit(x.title, x.description)).forEach((x) => out.push({ kind: 'service', id: x.id, title: x.title, snippet: x.description ?? '' }));
        d.places.filter((x) => x.communityId === communityId && hit(x.name, x.description)).forEach((x) => out.push({ kind: 'place', id: x.id, title: x.name, snippet: x.description ?? '' }));
        d.organisations.filter((x) => x.communityId === communityId && hit(x.name, x.description)).forEach((x) => out.push({ kind: 'organisation', id: x.id, title: x.name, snippet: x.description ?? '' }));
        d.events.filter((x) => x.communityId === communityId && hit(x.title, x.description)).forEach((x) => out.push({ kind: 'event', id: x.id, title: x.title, snippet: x.description ?? '' }));
        d.listings.filter((x) => x.communityId === communityId && x.status === 'active' && hit(x.title, x.description)).forEach((x) => out.push({ kind: 'listing', id: x.id, title: x.title, snippet: x.description ?? '' }));
        d.requests.filter((x) => x.communityId === communityId && (x.status === 'open' || x.status === 'answered') && hit(x.title, x.description)).forEach((x) => out.push({ kind: 'request', id: x.id, title: x.title, snippet: x.description ?? '' }));
        return out.slice(0, 40);
      },
    },

    moderation: {
      async report(input) {
        const p = reportSchema.parse(input);
        const reporterId = requireProfileId();
        const d = db();
        const communityId = mockCommunityOf(p.targetKind, p.targetId);
        if (!communityId) throw new Error('that item was not found');
        if (d.reports.filter((r) => r.reporterId === reporterId && r.createdAt > new Date(Date.now() - 86400000).toISOString()).length >= 10) {
          throw new Error('you have reached the daily report limit');
        }
        const existing = d.reports.find((r) => r.reporterId === reporterId && r.targetKind === p.targetKind && r.targetId === p.targetId);
        if (existing) {
          existing.reason = p.reason;
          existing.note = p.note ?? null;
        } else {
          d.reports.push({
            id: uid(), communityId, reporterId, targetKind: p.targetKind, targetId: p.targetId,
            reason: p.reason, note: p.note ?? null, priority: p.reason === 'unsafe', status: 'open', createdAt: nowIso(),
          });
        }
        maybeAutoHide(communityId, p.targetKind, p.targetId, reporterId);
        persist();
      },
      async reports(communityId) {
        const d = db();
        if (!mockCanModerate(communityId)) return [];
        return d.reports
          .filter((r) => r.communityId === communityId && r.status === 'open')
          .sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || b.createdAt.localeCompare(a.createdAt))
          .map((r) => ({
            id: r.id, communityId: r.communityId, reporterId: r.reporterId, reporterName: profileName(r.reporterId),
            targetKind: r.targetKind as never, targetId: r.targetId, targetLabel: mockTargetLabel(r.targetKind, r.targetId),
            reason: r.reason as never, note: r.note, priority: r.priority, status: r.status,
            reportCount: d.reports.filter((x) => x.targetKind === r.targetKind && x.targetId === r.targetId && x.status === 'open').length,
            createdAt: r.createdAt,
          }));
      },
      async decide(reportId, uphold) {
        const d = db();
        const rep = d.reports.find((r) => r.id === reportId);
        if (!rep) throw new Error('report not found');
        if (!mockCanModerate(rep.communityId)) throw new Error('not allowed');
        rep.status = uphold ? 'upheld' : 'dismissed';
        if (uphold) {
          mockSetHidden(rep.targetKind, rep.targetId, true, 'upheld by moderator');
          d.moderationActions.push({ id: uid(), communityId: rep.communityId, actorId: getCurrentProfileId(), targetKind: rep.targetKind, targetId: rep.targetId, action: 'hide', detail: { report: reportId }, createdAt: nowIso() });
        }
        persist();
      },
      async moderate(action, targetKind, targetId, detail = {}) {
        const d = db();
        const communityId = (action === 'suspend' || action === 'unsuspend' || action === 'trustChange')
          ? String(detail.community_id ?? '') : mockCommunityOf(targetKind, targetId);
        if (!communityId) throw new Error('target community unknown');
        const viewer = getCurrentProfileId();
        const allowed = (viewer && isMockAdmin(viewer)) || ((action === 'hide' || action === 'unhide') && trustInMock(viewer ?? '', communityId) >= 3);
        if (!allowed) throw new Error('not allowed');
        if (action === 'hide' || action === 'remove') mockSetHidden(targetKind, targetId, true, String(detail.reason ?? 'hidden by moderator'));
        if (action === 'unhide') mockSetHidden(targetKind, targetId, false, null);
        if (action === 'suspend') {
          const m = d.memberships.find((x) => x.profileId === targetId && x.communityId === communityId);
          if (m) m.suspendedUntil = new Date(Date.now() + (Number(detail.days ?? 7)) * 86400000).toISOString();
        }
        if (action === 'unsuspend') {
          const m = d.memberships.find((x) => x.profileId === targetId && x.communityId === communityId);
          if (m) m.suspendedUntil = null;
        }
        if (action === 'trustChange') {
          const m = d.memberships.find((x) => x.profileId === targetId && x.communityId === communityId);
          if (m && detail.level != null) m.trustLevel = Number(detail.level) as TrustLevel;
        }
        if (action === 'hide' || action === 'remove') {
          d.reports.filter((r) => r.targetKind === targetKind && r.targetId === targetId && r.status === 'open').forEach((r) => { r.status = 'upheld'; });
        }
        d.moderationActions.push({ id: uid(), communityId, actorId: viewer, targetKind, targetId, action, detail, createdAt: nowIso() });
        persist();
      },
      async log(communityId) {
        const d = db();
        if (!mockCanModerate(communityId)) return [];
        return d.moderationActions
          .filter((a) => a.communityId === communityId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((a) => ({
            id: a.id, communityId: a.communityId, actorId: a.actorId, actorName: a.actorId ? profileName(a.actorId) : 'Automation',
            targetKind: a.targetKind, targetId: a.targetId, action: a.action as never, detail: a.detail, createdAt: a.createdAt,
          }));
      },
      async hidden(communityId) {
        const d = db();
        if (!mockCanModerate(communityId)) return [];
        return d.hidden
          .filter((h) => mockCommunityOf(h.kind, h.id) === communityId)
          .sort((a, b) => b.hiddenAt.localeCompare(a.hiddenAt))
          .map((h) => ({ kind: h.kind as never, id: h.id, title: mockTargetLabel(h.kind, h.id) ?? '(removed)', reason: h.reason, hiddenAt: h.hiddenAt }));
      },
      async delays(communityId) {
        const d = db();
        if (!mockCanModerate(communityId)) return [];
        return d.firstPostDelays
          .filter((x) => x.communityId === communityId)
          .map((x) => ({ id: x.id, profileId: x.profileId, profileName: profileName(x.profileId), contentKind: x.contentKind, contentId: x.contentId, releaseAt: x.releaseAt, releasedAt: x.releasedAt }));
      },
      async releaseDelay(delayId) {
        const d = db();
        const delay = d.firstPostDelays.find((x) => x.id === delayId);
        if (!delay) throw new Error('not found');
        if (!mockCanModerate(delay.communityId)) throw new Error('not allowed');
        mockSetHidden(delay.contentKind, delay.contentId, false, null);
        delay.releasedAt = nowIso();
        d.moderationActions.push({ id: uid(), communityId: delay.communityId, actorId: getCurrentProfileId(), targetKind: delay.contentKind, targetId: delay.contentId, action: 'unhide', detail: { firstPostRelease: true }, createdAt: nowIso() });
        persist();
      },
      async members(communityId) {
        const d = db();
        if (!mockCanModerate(communityId)) return [];
        return d.memberships
          .filter((m) => m.communityId === communityId)
          .map((m) => {
            const p = d.profiles.find((x) => x.id === m.profileId);
            return {
              profileId: m.profileId, displayName: p?.displayName ?? '', avatarUrl: p?.avatarUrl ?? null,
              trustLevel: m.trustLevel, status: m.status, suspendedUntil: m.suspendedUntil, joinedAt: m.createdAt,
              upheldReports: d.reports.filter((r) => r.targetKind === 'profile' && r.targetId === m.profileId && r.status === 'upheld').length,
            };
          })
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
      },
      async dashboard(communityId) {
        const d = db();
        const rep = d.reports.filter((r) => r.communityId === communityId && r.status === 'open');
        return {
          openReports: rep.length,
          priorityReports: rep.filter((r) => r.priority).length,
          hiddenItems: d.hidden.filter((h) => mockCommunityOf(h.kind, h.id) === communityId).length,
          pendingClaims: d.businesses.filter((b) => b.communityId === communityId && b.claimedAt && !b.verifiedAt).length,
          delayedPosts: d.firstPostDelays.filter((x) => x.communityId === communityId && !x.releasedAt).length,
          newMembersToday: d.memberships.filter((m) => m.communityId === communityId && m.createdAt > new Date(Date.now() - 86400000).toISOString()).length,
          activeAlerts: d.alerts.filter((a) => a.communityId === communityId && !a.resolvedAt).length,
        };
      },
      async config(communityId, patch) {
        const d = db();
        const viewer = getCurrentProfileId();
        if (!viewer || !isMockAdmin(viewer)) throw new Error('admin only');
        const c = d.communities.find((x) => x.id === communityId);
        if (!c) throw new Error('community not found');
        c.config = { ...c.config, ...patch };
        persist();
        return c;
      },
      async triage(reportId) {
        const rep = db().reports.find((r) => r.id === reportId);
        return triageReport({ reason: rep?.reason ?? 'other', note: rep?.note ?? null });
      },
    },

    media: {
      async upload(files) {
        // No storage in the mock — inline the images as data URIs so they render locally.
        return Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('could not read the image'));
          reader.readAsDataURL(file);
        })));
      },
    },

    account: {
      async export() {
        const d = db();
        const me = requireProfileId();
        const p = d.profiles.find((x) => x.id === me);
        return {
          profile: p ? { id: p.id, display_name: p.displayName, email: p.email, bio: p.bio, date_of_birth: p.dateOfBirth, created_at: p.createdAt } : null,
          memberships: d.memberships.filter((m) => m.profileId === me),
          listings: d.listings.filter((l) => l.createdBy === me).map((l) => ({ id: l.id, title: l.title, created_at: l.createdAt })),
          requests: d.requests.filter((r) => r.createdBy === me).map((r) => ({ id: r.id, title: r.title, created_at: r.createdAt })),
          messages: d.messages.filter((m) => m.senderId === me).map((m) => ({ id: m.id, body: m.body, created_at: m.createdAt })),
        };
      },
      async delete() {
        const d = db();
        const me = requireProfileId();
        const p = d.profiles.find((x) => x.id === me);
        if (p) {
          p.displayName = 'Former neighbour';
          p.email = `deleted+${p.id}@removed.invalid`;
          p.bio = null;
          p.avatarUrl = null;
          p.peopleDirectoryOptIn = false;
        }
        d.notifications = d.notifications.filter((n) => n.profileId !== me);
        persist();
        setCurrentProfileId(null);
      },
    },
  };
}

/** Community of a moderatable target in the mock (mirror of mod_community). */
function mockCommunityOf(kind: string, id: string): string {
  const d = db();
  const find = <T extends { id: string; communityId: string }>(rows: T[]) => rows.find((r) => r.id === id)?.communityId ?? '';
  switch (kind) {
    case 'listing': return find(d.listings);
    case 'request': return find(d.requests);
    case 'event': return find(d.events);
    case 'alert': return find(d.alerts);
    case 'business': return find(d.businesses);
    case 'organisation': return find(d.organisations);
    case 'place': return find(d.places);
    case 'service': return find(d.services);
    case 'equipment': return d.equipment.find((e) => e.id === id)?.communityId ?? '';
    case 'profile': return d.memberships.find((m) => m.profileId === id)?.communityId ?? '';
    case 'message': {
      const msg = d.messages.find((m) => m.id === id);
      return msg ? d.threads.find((t) => t.id === msg.threadId)?.communityId ?? '' : '';
    }
    default: return '';
  }
}

function mockTargetLabel(kind: string, id: string): string | null {
  const d = db();
  switch (kind) {
    case 'listing': return d.listings.find((x) => x.id === id)?.title ?? null;
    case 'request': return d.requests.find((x) => x.id === id)?.title ?? null;
    case 'event': return d.events.find((x) => x.id === id)?.title ?? null;
    case 'alert': return d.alerts.find((x) => x.id === id)?.title ?? null;
    case 'business': return d.businesses.find((x) => x.id === id)?.name ?? null;
    case 'organisation': return d.organisations.find((x) => x.id === id)?.name ?? null;
    case 'place': return d.places.find((x) => x.id === id)?.name ?? null;
    case 'service': return d.services.find((x) => x.id === id)?.title ?? null;
    case 'equipment': return d.equipment.find((x) => x.id === id)?.name ?? null;
    case 'message': return d.messages.find((x) => x.id === id)?.body?.slice(0, 80) ?? null;
    case 'profile': return d.profiles.find((x) => x.id === id)?.displayName ?? null;
    default: return null;
  }
}

function mockSetHidden(kind: string, id: string, hide: boolean, reason: string | null): void {
  const d = db();
  const at = d.hidden.findIndex((h) => h.kind === kind && h.id === id);
  if (hide) {
    if (at === -1) d.hidden.push({ kind, id, reason, hiddenAt: nowIso() });
  } else if (at !== -1) {
    d.hidden.splice(at, 1);
  }
}

function mockCanModerate(communityId: string): boolean {
  const viewer = getCurrentProfileId();
  if (!viewer) return false;
  return isMockAdmin(viewer) || trustInMock(viewer, communityId) >= 3;
}
