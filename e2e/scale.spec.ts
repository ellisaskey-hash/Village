import { test, expect, type Page } from '@playwright/test';

// M8 scale drill: 1000 listings in the data layer render as a small windowed DOM (virtualised),
// so the list stays smooth. Seeds the mock DB directly via localStorage, then counts DOM rows.

async function signUp(page: Page, email: string) {
  await page.goto('/welcome');
  await page.getByLabel('Your postcode').fill('DV1 1AA');
  await page.getByRole('button', { name: 'Find' }).click();
  await page.getByRole('button', { name: /Dev Village/ }).click();
  await page.getByLabel('Your name').fill('Scale Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password1');
  await page.getByLabel('Date of birth').fill('1990-07-07');
  await page.getByLabel('I agree to the community standard').check({ force: true });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('button', { name: /good neighbour/ }).click();
  await page.getByRole('button', { name: /Enter Dev Village/ }).click();
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible();
}

test('1000 listings render as a small virtualised window', async ({ page }) => {
  await signUp(page, 'scale@example.com');

  // Seed 1000 listings straight into the mock DB.
  await page.evaluate(() => {
    const raw = localStorage.getItem('local:mock-db');
    if (!raw) throw new Error('no mock db');
    const db = JSON.parse(raw);
    const me = localStorage.getItem('local:mock-profile');
    const community = db.communities.find((c: { slug: string }) => c.slug === 'dev-village');
    for (let i = 0; i < 1000; i++) {
      db.listings.push({
        id: 'scale-' + i, communityId: community.id, createdBy: me, authorName: 'Scale',
        kind: 'free', title: 'SCALE #' + i, description: null, category: 'misc',
        pricePence: null, status: 'active', createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
      });
    }
    localStorage.setItem('local:mock-db', JSON.stringify(db));
  });

  await page.goto('/explore?tab=listings');
  // At least one seeded row is on screen (list is populated)...
  await expect(page.getByText(/^SCALE #/).first()).toBeVisible();
  // ...but the DOM holds only a window, not all 1000 (virtualised).
  const rows = await page.getByText(/^SCALE #/).count();
  expect(rows).toBeGreaterThan(0);
  expect(rows).toBeLessThan(80);
});
