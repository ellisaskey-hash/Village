import { describe, it, expect, beforeEach } from 'vitest';
import { createMockServices } from '@/lib/services/mock';
import { db, resetMock } from '@/lib/services/mock/db';

beforeEach(() => {
  localStorage.clear();
  resetMock();
});

async function signUpInDevVillage(email: string) {
  const s = createMockServices();
  await s.auth.signUp({ displayName: email.split('@')[0]!, email, password: 'password1', dateOfBirth: '1990-01-01' });
  const m = await s.communities.join({ slug: 'dev-village', postcode: 'DV1 1AA' });
  return { s, communityId: m.communityId };
}

describe('trust-0 caps (server-side, mirrored in the mock)', () => {
  it('caps a trust-0 member at 2 active listings', async () => {
    const { s, communityId } = await signUpInDevVillage('cap@example.com');
    await s.listings.create(communityId, { kind: 'free', title: 'One', category: 'misc' });
    await s.listings.create(communityId, { kind: 'free', title: 'Two', category: 'misc' });
    await expect(s.listings.create(communityId, { kind: 'free', title: 'Three', category: 'misc' })).rejects.toThrow();
  });

  it('caps a trust-0 member at 1 open request', async () => {
    const { s, communityId } = await signUpInDevVillage('req@example.com');
    await s.requests.create(communityId, { title: 'Need a hand', category: 'help' });
    await expect(s.requests.create(communityId, { title: 'And another', category: 'help' })).rejects.toThrow();
  });
});

describe('cold-DM gate', () => {
  it('refuses a trust-0 cold DM but allows an in-context reply', async () => {
    // Owner posts a request (bump owner to trust 1 so they can post freely).
    const owner = createMockServices();
    const o = await owner.auth.signUp({ displayName: 'Owner', email: 'owner@example.com', password: 'password1', dateOfBirth: '1980-01-01' });
    const om = await owner.communities.join({ slug: 'dev-village', postcode: 'DV1 1AA' });
    const dm = db().memberships.find((m) => m.profileId === o.profileId && m.communityId === om.communityId)!;
    dm.trustLevel = 1;
    const req = await owner.requests.create(om.communityId, { title: 'Borrow a drill', category: 'borrow' });

    // A fresh trust-0 helper cannot cold-DM the owner...
    const helper = createMockServices();
    await helper.auth.signUp({ displayName: 'Helper', email: 'helper@example.com', password: 'password1', dateOfBirth: '1990-01-01' });
    await helper.communities.join({ slug: 'dev-village', postcode: 'DV1 1AA' });
    await expect(helper.threads.open('direct', null, o.profileId, 'hey')).rejects.toThrow();

    // ...but can respond in-context to the request (opens a thread and answers it).
    const threadId = await helper.threads.open('request', req.id, null, 'I have a drill you can borrow');
    expect(threadId).toBeTruthy();
    expect((await owner.requests.get(req.id))!.status).toBe('answered');
  });
});

describe('the mutual-aid loop + notifications', () => {
  it('respond -> owner notified -> owner marks fulfilled', async () => {
    const owner = createMockServices();
    await owner.auth.signUp({ displayName: 'Owner', email: 'o2@example.com', password: 'password1', dateOfBirth: '1980-01-01' });
    const om = await owner.communities.join({ slug: 'dev-village', postcode: 'DV1 1AA' });
    const req = await owner.requests.create(om.communityId, { title: 'Lift to the station', category: 'lifts' });

    const helper = createMockServices();
    await helper.auth.signUp({ displayName: 'Helper', email: 'h2@example.com', password: 'password1', dateOfBirth: '1990-01-01' });
    await helper.communities.join({ slug: 'dev-village', postcode: 'DV1 1AA' });
    await helper.threads.open('request', req.id, null, 'I can take you at 8');

    // Switch back to the owner (the mock has a single current user).
    await owner.auth.signIn('o2@example.com', 'password1');

    // The owner has a message notification.
    const notes = await owner.notifications.mine();
    expect(notes.some((n) => n.category === 'message')).toBe(true);

    // The owner marks the request sorted.
    const updated = await owner.requests.setStatus(req.id, 'fulfilled');
    expect(updated.status).toBe('fulfilled');
  });
});
