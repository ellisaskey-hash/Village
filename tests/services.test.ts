import { describe, it, expect, beforeEach } from 'vitest';
import { createMockServices } from '@/lib/services/mock';
import { db, resetMock } from '@/lib/services/mock/db';
import { signUpSchema } from '@/lib/services/contracts';

function isoOffsetYears(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => {
  localStorage.clear();
  resetMock();
});

describe('signUpSchema — 16+ gate', () => {
  it('refuses a 15-year-old DOB', () => {
    const res = signUpSchema.safeParse({
      displayName: 'Too Young',
      email: 'teen@example.com',
      password: 'password1',
      dateOfBirth: isoOffsetYears(15),
    });
    expect(res.success).toBe(false);
  });

  it('accepts a 16-year-old DOB', () => {
    const res = signUpSchema.safeParse({
      displayName: 'Old Enough',
      email: 'ok@example.com',
      password: 'password1',
      dateOfBirth: isoOffsetYears(16),
    });
    expect(res.success).toBe(true);
  });
});

describe('mock community join', () => {
  it('postcode path grants trust 0 when the district matches', async () => {
    const s = createMockServices();
    await s.auth.signUp({ displayName: 'Ava', email: 'ava@example.com', password: 'password1', dateOfBirth: '1990-01-01' });
    const m = await s.communities.join({ slug: 'dev-village', postcode: 'DV1 1AA' });
    expect(m.trustLevel).toBe(0);
    expect(m.joinedVia).toBe('postcode');
  });

  it('refuses a postcode outside the community district', async () => {
    const s = createMockServices();
    await s.auth.signUp({ displayName: 'Ben', email: 'ben@example.com', password: 'password1', dateOfBirth: '1990-01-01' });
    await expect(s.communities.join({ slug: 'dev-village', postcode: 'ZZ9 9ZZ' })).rejects.toThrow();
  });

  it('invite path grants trust 1', async () => {
    const s = createMockServices();
    // An established member crafts an invite.
    const inviter = await s.auth.signUp({ displayName: 'Iris', email: 'iris@example.com', password: 'password1', dateOfBirth: '1985-01-01' });
    const community = db().communities.find((c) => c.slug === 'dev-village')!;
    db().invites.push({
      code: 'TESTCODE',
      communityId: community.id,
      createdBy: inviter.profileId,
      maxUses: 10,
      uses: 0,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    });
    // A newcomer joins on the invite.
    await s.auth.signUp({ displayName: 'Newcomer', email: 'new@example.com', password: 'password1', dateOfBirth: '1999-01-01' });
    const m = await s.communities.join({ slug: 'dev-village', inviteCode: 'TESTCODE' });
    expect(m.trustLevel).toBe(1);
    expect(m.joinedVia).toBe('invite');
  });
});

describe('mock discovery', () => {
  it('finds Horsmonden for a TN12 postcode and nothing for an unknown district', async () => {
    const s = createMockServices();
    const found = await s.communities.discover('TN12 8AA');
    expect(found.map((c) => c.slug)).toContain('horsmonden');
    expect(await s.communities.discover('ZZ99 9ZZ')).toHaveLength(0);
  });
});
