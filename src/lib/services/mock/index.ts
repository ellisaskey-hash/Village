// Mock Services — the no-DB implementation. Mirrors the RPC/RLS behaviour so screens behave
// as they will against Postgres. Every mutation persists to localStorage.
import {
  joinSchema,
  listingSchema,
  requestSchema,
  signUpSchema,
  type JoinInput,
  type ListingInput,
  type ProfilePatch,
  type RequestInput,
  type Services,
  type SignUpInput,
} from '../contracts';
import type {
  Community,
  CommunityCard,
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
  Session,
  ThreadContext,
  ThreadSummary,
  TrustLevel,
} from '../types';
import { horsmondenDrafts } from '@/lib/ingest/horsmondenFixture';
import {
  db,
  getCurrentProfileId,
  persist,
  postcodeDistrict,
  setCurrentProfileId,
  uid,
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
      async business(id) {
        return db().businesses.find((b) => b.id === id) ?? null;
      },
      async place(id) {
        return db().places.find((p) => p.id === id) ?? null;
      },
      async organisation(id) {
        return db().organisations.find((o) => o.id === id) ?? null;
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
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async get(id) {
        return db().listings.find((l) => l.id === id) ?? null;
      },
      async create(communityId, input: ListingInput) {
        const parsed = listingSchema.parse(input);
        const profileId = requireProfileId();
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
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async get(id) {
        return db().requests.find((r) => r.id === id) ?? null;
      },
      async create(communityId, input: RequestInput) {
        const parsed = requestSchema.parse(input);
        const profileId = requireProfileId();
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
    },
  };
}
