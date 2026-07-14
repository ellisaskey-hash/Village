import { describe, it, expect, beforeEach } from 'vitest';
import { createMockServices } from '@/lib/services/mock';
import { db, resetMock } from '@/lib/services/mock/db';

// Mirrors verify-m7 against the mock: auto-hide (author sees / third party doesn't), admin
// actions logged, suspension blocks writes not reads, GDPR export/delete.
beforeEach(() => {
  localStorage.clear();
  resetMock();
});

async function member(email: string, trust = 0) {
  const s = createMockServices();
  await s.auth.signUp({ displayName: email.split('@')[0]!, email, password: 'password1', dateOfBirth: '1985-01-01' });
  const m = await s.communities.join({ slug: 'dev-village', postcode: 'DV1 1AA' });
  const row = db().memberships.find((x) => x.profileId && x.communityId === m.communityId && db().profiles.find((p) => p.id === x.profileId)?.email === email)!;
  if (trust) row.trustLevel = trust as 0 | 1 | 2 | 3;
  return { s, communityId: m.communityId };
}

describe('auto-hide after reports', () => {
  it('hides at the threshold: author still sees it, a third party does not', async () => {
    const author = await member('author@example.com');
    const listing = await author.s.listings.create(author.communityId, { kind: 'free', title: 'Sofa', category: 'x' });

    for (const email of ['r1@example.com', 'r2@example.com', 'r3@example.com']) {
      const r = await member(email);
      await r.s.moderation.report({ targetKind: 'listing', targetId: listing.id, reason: 'spam' });
    }

    // Third party cannot see it.
    const viewer = await member('viewer@example.com');
    expect(await viewer.s.listings.get(listing.id)).toBeNull();
    expect((await viewer.s.listings.list(author.communityId)).some((l) => l.id === listing.id)).toBe(false);

    // Author still sees it, flagged hidden pending review.
    await author.s.auth.signIn('author@example.com', 'password1');
    const seen = await author.s.listings.get(listing.id);
    expect(seen?.hidden).toBe(true);
  });
});

describe('admin actions are logged, suspension blocks writes not reads', () => {
  it('suspend stops posting but not reading, and every action is in the log', async () => {
    const admin = await member('admin@example.com');
    db().profiles.find((p) => p.email === 'admin@example.com')!.platformRole = 'admin';

    const target = await member('target@example.com', 1);
    const before = await target.s.listings.create(target.communityId, { kind: 'free', title: 'Before', category: 'x' });

    await admin.s.auth.signIn('admin@example.com', 'password1');
    await admin.s.moderation.moderate('suspend', 'profile', db().profiles.find((p) => p.email === 'target@example.com')!.id, { community_id: admin.communityId, days: 7 });

    await target.s.auth.signIn('target@example.com', 'password1');
    // Write blocked...
    await expect(target.s.listings.create(target.communityId, { kind: 'free', title: 'After', category: 'x' })).rejects.toThrow();
    // ...read still works.
    expect(await target.s.listings.get(before.id)).not.toBeNull();

    // The action is logged.
    await admin.s.auth.signIn('admin@example.com', 'password1');
    const log = await admin.s.moderation.log(admin.communityId);
    expect(log.some((a) => a.action === 'suspend')).toBe(true);
  });
});

describe('GDPR export and delete', () => {
  it('exports the caller data and anonymises on delete while content survives', async () => {
    const me = await member('gdpr@example.com', 1);
    const listing = await me.s.listings.create(me.communityId, { kind: 'free', title: 'Keepsake', category: 'x' });

    const exported = await me.s.account.export();
    expect((exported.profile as { email: string }).email).toBe('gdpr@example.com');
    expect(Array.isArray(exported.listings)).toBe(true);

    await me.s.account.delete();
    const profile = db().profiles.find((p) => p.id === listing.createdBy)!;
    expect(profile.displayName).toBe('Former neighbour');
    expect(profile.email.startsWith('deleted+')).toBe(true);
    // Content survives.
    expect(db().listings.some((l) => l.id === listing.id)).toBe(true);
  });
});
