// Mock Services — the no-DB implementation. Mirrors the RPC/RLS behaviour so screens behave
// as they will against Postgres. Every mutation persists to localStorage.
import {
  joinSchema,
  signUpSchema,
  type JoinInput,
  type ProfilePatch,
  type Services,
  type SignUpInput,
} from '../contracts';
import type {
  Community,
  CommunityCard,
  Identity,
  Invite,
  MemberSummary,
  Membership,
  MembershipSummary,
  Profile,
  Session,
  TrustLevel,
} from '../types';
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
  };
}
