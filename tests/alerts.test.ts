import { describe, it, expect, beforeEach } from 'vitest';
import { createMockServices } from '@/lib/services/mock';
import { db, resetMock } from '@/lib/services/mock/db';

beforeEach(() => {
  localStorage.clear();
  resetMock();
});

async function member(tag: string, trust = 0) {
  const s = createMockServices();
  const session = await s.auth.signUp({ displayName: tag, email: `${tag}@example.com`, password: 'password1', dateOfBirth: '1990-01-01' });
  const m = await s.communities.join({ slug: 'dev-village', postcode: 'DV1 1AA' });
  if (trust > 0) {
    const row = db().memberships.find((x) => x.profileId === session.profileId && x.communityId === m.communityId)!;
    row.trustLevel = trust as 0 | 1 | 2 | 3;
  }
  return { s, id: session.profileId, communityId: m.communityId, email: `${tag}@example.com` };
}

describe('M5 alerts — fan-out respects opt-out; trust gate', () => {
  it('notifies opted-in members and skips opted-out ones', async () => {
    const org = await member('org', 1);
    const other = await member('other');
    const opted = await member('opted');
    db().profiles.find((p) => p.id === opted.id)!.notificationPrefs = { 'alert.community': false };

    await org.s.auth.signIn(org.email, 'password1');
    await org.s.alerts.post(org.communityId, { tier: 'community', category: 'lostPet', title: 'Lost cat', body: 'Ginger tom' });

    await other.s.auth.signIn(other.email, 'password1');
    expect((await other.s.notifications.mine()).some((n) => n.title === 'Lost cat')).toBe(true);

    await opted.s.auth.signIn(opted.email, 'password1');
    expect((await opted.s.notifications.mine()).some((n) => n.title === 'Lost cat')).toBe(false);
  });

  it('trust-0 members cannot post an alert', async () => {
    const t0 = await member('tzero');
    await expect(t0.s.alerts.post(t0.communityId, { tier: 'community', category: 'notice', title: 'Nope' })).rejects.toThrow();
  });

  it('the community alert appears in the live list until resolved', async () => {
    const org = await member('org2', 1);
    const a = await org.s.alerts.post(org.communityId, { tier: 'community', category: 'notice', title: 'Bin day moved' });
    expect((await org.s.alerts.list(org.communityId)).some((x) => x.id === a.id)).toBe(true);
    await org.s.alerts.resolve(a.id);
    expect((await org.s.alerts.list(org.communityId)).some((x) => x.id === a.id)).toBe(false);
  });
});
