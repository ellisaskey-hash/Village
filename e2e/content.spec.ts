import { test, expect, type Page } from '@playwright/test';

/**
 * M3 content lifecycle (behavioural baseline, Law 18): post a request through the composer,
 * see it in Explore, open it, and mark it sorted; post a listing likewise. The cross-user
 * respond -> thread -> fulfil loop is unit-tested (tests/content.test.ts) because the mock has
 * a single current user; true two-device realtime needs Supabase (BLOCKED).
 */
async function join(page: Page, email: string) {
  await page.goto('/welcome');
  await page.getByLabel('Your postcode').fill('DV1 1AA');
  await page.getByRole('button', { name: 'Find' }).click();
  await page.getByRole('button', { name: /Dev Village/ }).click();
  await page.getByLabel('Your name').fill('Poster');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password1');
  await page.getByLabel('Date of birth').fill('1990-01-01');
  await page.getByLabel('I agree to the community standard').check({ force: true });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('button', { name: /Enter Dev Village/ }).click();
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible();
}

test('post a request via the composer, then mark it sorted', async ({ page }) => {
  await join(page, 'poster-req@example.com');

  await page.getByRole('button', { name: 'Post', exact: true }).and(page.locator(':visible')).click();
  await page.getByRole('button', { name: 'Continue' }).click(); // "Request help" is the default tile
  await page.getByLabel('What do you need?').fill('Borrow a ladder this weekend');
  await page.getByRole('button', { name: 'Post request' }).click();

  // Lands on the request detail.
  await expect(page.getByRole('heading', { name: 'Request' })).toBeVisible();
  await expect(page.getByText('Borrow a ladder this weekend')).toBeVisible();

  // Author marks it sorted.
  await page.getByRole('button', { name: 'Mark as sorted' }).click();
  await expect(page.getByRole('button', { name: 'Sorted' })).toBeVisible();

  // It shows in Explore -> Requests.
  await page.goto('/explore?tab=requests');
  await expect(page.getByText('Borrow a ladder this weekend')).toBeVisible();
});

test('post a listing via the composer', async ({ page }) => {
  await join(page, 'poster-list@example.com');

  await page.getByRole('button', { name: 'Post', exact: true }).and(page.locator(':visible')).click();
  await page.getByRole('radio', { name: /Sell or give away/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Title').fill('Solid oak garden bench');
  await page.getByLabel('Category').fill('Furniture');
  await page.getByRole('dialog').getByRole('button', { name: 'Post', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Listing' })).toBeVisible();
  await expect(page.getByText('Solid oak garden bench')).toBeVisible();
});
