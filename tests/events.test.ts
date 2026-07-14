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

describe('M4 events — capacity, waitlist, promotion (mock mirrors the RPC)', () => {
  it('waitlists past capacity, then promotes when a spot frees', async () => {
    const org = await member('org', 1);
    const ev = await org.s.events.create(org.communityId, {
      title: 'Quiz night', category: 'community', startsAt: new Date(Date.now() + 864e5).toISOString(), rsvpMode: 'capacity', capacity: 1,
    });

    const a = await member('aa');
    await a.s.events.rsvp(ev.id, 'going');
    expect((await a.s.events.get(ev.id))!.myRsvp).toBe('going');

    const b = await member('bb');
    await b.s.events.rsvp(ev.id, 'going');
    expect((await b.s.events.get(ev.id))!.myRsvp).toBe('waitlist');

    // a cancels -> b promoted
    await a.s.auth.signIn(a.email, 'password1');
    await a.s.events.rsvp(ev.id, 'cancelled');
    await b.s.auth.signIn(b.email, 'password1');
    expect((await b.s.events.get(ev.id))!.myRsvp).toBe('going');
  });

  it('trust-0 members cannot create events', async () => {
    const t0 = await member('t0');
    await expect(
      t0.s.events.create(t0.communityId, { title: 'Nope', category: 'other', startsAt: new Date().toISOString(), rsvpMode: 'open' }),
    ).rejects.toThrow();
  });
});
